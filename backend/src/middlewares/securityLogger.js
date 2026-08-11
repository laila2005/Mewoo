// ─────────────────────────────────────────────────────────────
// Security Logger Middleware — SQL Injection Security Story 7
// Scans all incoming requests for known SQLi attack patterns.
// Blocks malicious requests and logs attempts to security log.
//
// Detection and blocking are entirely DETERMINISTIC. The Security Agent is
// invoked afterwards, out-of-band, purely to classify and explain the event —
// it never participates in the decision to block.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeSecurityEvent } from '../ai/securityAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const isVercel = !!process.env.VERCEL;
const logsDir = isVercel
    ? path.join('/tmp', 'logs')
    : path.join(__dirname, '..', '..', 'logs');

try {
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
} catch (err) {
    console.warn('Warning: Could not create security logs directory:', logsDir, err.message);
}

const securityLogPath = path.join(logsDir, 'security.log');

// ── Known SQLi Attack Patterns ──────────────────────────────
const SQLI_PATTERNS = [
    /'\s*OR\s+\d+\s*=\s*\d+/i,          // ' OR 1=1
    /'\s*OR\s+'[^']*'\s*=\s*'[^']*/i,    // ' OR 'a'='a
    /UNION\s+(ALL\s+)?SELECT/i,           // UNION SELECT
    /DROP\s+TABLE/i,                       // DROP TABLE
    /DROP\s+DATABASE/i,                    // DROP DATABASE
    /ALTER\s+TABLE/i,                      // ALTER TABLE
    /DELETE\s+FROM/i,                      // DELETE FROM
    /INSERT\s+INTO/i,                      // INSERT INTO (in query params)
    /SLEEP\s*\(/i,                         // SLEEP()
    /BENCHMARK\s*\(/i,                     // BENCHMARK()
    /WAITFOR\s+DELAY/i,                    // WAITFOR DELAY
    /;\s*(DROP|ALTER|DELETE|INSERT|UPDATE|CREATE|TRUNCATE)/i,  // ; followed by SQL keywords
    /--\s*$/m,                             // SQL comment at end
    /\/\*[\s\S]*?\*\//,                    // Block comments /* */
    /'\s*;\s*--/,                           // '; --
    /EXEC\s*\(/i,                          // EXEC()
    /xp_cmdshell/i,                        // xp_cmdshell
    /INFORMATION_SCHEMA/i,                 // Information schema probing
    /LOAD_FILE\s*\(/i,                     // LOAD_FILE()
    /INTO\s+(OUT|DUMP)FILE/i,              // INTO OUTFILE / DUMPFILE
];

// ── Deep Scan Object Values ─────────────────────────────────
function extractValues(obj, depth = 0) {
    if (depth > 5) return []; // Prevent deep recursion attacks
    const values = [];
    if (typeof obj === 'string') {
        values.push(obj);
    } else if (Array.isArray(obj)) {
        for (const item of obj) {
            values.push(...extractValues(item, depth + 1));
        }
    } else if (obj && typeof obj === 'object') {
        for (const val of Object.values(obj)) {
            values.push(...extractValues(val, depth + 1));
        }
    }
    return values;
}

// ── Log Security Event ──────────────────────────────────────
function logSecurityEvent(event) {
    const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...event
    }) + '\n';

    // Console warning (always). Report the actual event type — this function
    // also logs abuse events and agent analyses, not just SQLi.
    console.warn(`🛡️ [SECURITY] ${event.type} from ${event.ip} on ${event.path}`);

    // Append to security log file
    fs.appendFile(securityLogPath, logEntry, (err) => {
        if (err) console.error('Failed to write security log:', err.message);
    });
}

// ── Security Agent triage (AI, advisory only) ────────────────
// The middleware has already decided and blocked. This adds an explanation and
// a risk classification out-of-band; it can never change enforcement.
//
// Throttled hard: an attacker sending a flood of payloads would otherwise turn
// each blocked request into an LLM call (cost amplification + provider rate
// limits). Analysis is a sample, not a per-request guarantee.
const AGENT_WINDOW_MS = 5 * 60 * 1000;
const AGENT_MAX_PER_WINDOW = Number(process.env.SECURITY_AGENT_MAX_PER_WINDOW) || 20;
const AGENT_IP_COOLDOWN_MS = 60 * 1000;
let agentWindowStart = Date.now();
let agentCallsInWindow = 0;
const lastAnalyzedByIp = new Map();

function shouldAnalyze(ip) {
    if (process.env.SECURITY_AGENT_ENABLED === 'false') return false;
    const now = Date.now();
    if (now - agentWindowStart > AGENT_WINDOW_MS) {
        agentWindowStart = now;
        agentCallsInWindow = 0;
    }
    if (agentCallsInWindow >= AGENT_MAX_PER_WINDOW) return false;
    if (now - (lastAnalyzedByIp.get(ip) || 0) < AGENT_IP_COOLDOWN_MS) return false;
    lastAnalyzedByIp.set(ip, now);
    agentCallsInWindow++;
    return true;
}

// Fire-and-forget: never awaited, so a blocked request is not delayed by model
// latency. Resolves to nothing and swallows its own errors so it can never
// surface as an unhandled rejection.
function analyzeAndLogSecurityEvent(event) {
    if (!shouldAnalyze(event.ip)) return;

    analyzeSecurityEvent(event)
        .then((analysis) => {
            console.log('🤖 [SECURITY AGENT]', {
                classification: analysis.classification,
                riskLevel: analysis.riskLevel,
                confidence: analysis.confidence,
                recommendedAction: analysis.recommendedAction,
                reason: analysis.reason
            });
            // Logged as its own event type. NOT fed back into the agent.
            logSecurityEvent({
                type: 'SECURITY_AGENT_ANALYSIS',
                severity: analysis.riskLevel,
                ip: event.ip,
                method: event.method,
                path: event.path,
                classification: analysis.classification,
                confidence: analysis.confidence,
                reason: analysis.reason,
                recommendedAction: analysis.recommendedAction
            });
        })
        .catch((error) => {
            console.error('Security Agent analysis failed:', error.message);
            logSecurityEvent({
                type: 'SECURITY_AGENT_ANALYSIS',
                severity: 'HIGH',
                ip: event.ip,
                method: event.method,
                path: event.path,
                classification: 'UNKNOWN',
                confidence: 0,
                reason: 'Security Agent unavailable',
                recommendedAction: 'INVESTIGATE'
            });
        });
}

// ── Middleware: SQLi Detection & Blocking ────────────────────
export function sqliProtection(req, res, next) {
    // Collect all user-controlled input
    const allValues = [
        ...extractValues(req.body),
        ...extractValues(req.query),
        ...extractValues(req.params)
    ];

    for (const value of allValues) {
        for (const pattern of SQLI_PATTERNS) {
            if (pattern.test(value)) {
                const securityEvent = {
                    type: 'SQL_INJECTION_ATTEMPT',
                    severity: 'CRITICAL',
                    ip: req.ip || req.connection?.remoteAddress || 'unknown',
                    method: req.method,
                    path: req.originalUrl,
                    matchedPattern: pattern.toString(),
                    matchedValue: value.substring(0, 200), // Truncate for safety
                    userAgent: req.headers['user-agent'] || 'unknown'
                };

                logSecurityEvent(securityEvent);
                analyzeAndLogSecurityEvent(securityEvent); // never awaited

                return res.status(403).json({
                    error: 'Request blocked for security reasons'
                });
            }
        }
    }

    next();
}

// ── Middleware: Request Abuse Monitor ────────────────────────
const requestCounts = new Map();
const ABUSE_THRESHOLD = 50; // 50 failed requests from same IP in 5 minutes
const ABUSE_WINDOW = 5 * 60 * 1000; // 5 minutes

export function abuseMonitor(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';

    // Hook into response to detect failed requests
    const originalJson = res.json.bind(res);
    res.json = function(data) {
        if (res.statusCode >= 400) {
            const key = `${ip}`;
            const now = Date.now();
            const entry = requestCounts.get(key) || { count: 0, windowStart: now };

            if (now - entry.windowStart > ABUSE_WINDOW) {
                entry.count = 1;
                entry.windowStart = now;
            } else {
                entry.count++;
            }

            requestCounts.set(key, entry);

            if (entry.count >= ABUSE_THRESHOLD) {
                const securityEvent = {
                    type: 'REQUEST_ABUSE_DETECTED',
                    severity: 'HIGH',
                    ip,
                    method: req.method,
                    path: req.originalUrl,
                    failedRequests: entry.count,
                    window: '5 minutes'
                };

                logSecurityEvent(securityEvent);
                analyzeAndLogSecurityEvent(securityEvent); // never awaited
            }
        }
        return originalJson(data);
    };

    next();
}

// Cleanup stale entries every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of requestCounts.entries()) {
        if (now - entry.windowStart > ABUSE_WINDOW * 2) {
            requestCounts.delete(key);
        }
    }
    // Same for the agent's per-IP cooldown map, or it grows without bound
    // under a distributed flood.
    for (const [ip, ts] of lastAnalyzedByIp.entries()) {
        if (now - ts > AGENT_IP_COOLDOWN_MS * 5) lastAnalyzedByIp.delete(ip);
    }
}, 10 * 60 * 1000);
