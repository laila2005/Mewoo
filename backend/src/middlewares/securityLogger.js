// ─────────────────────────────────────────────────────────────
// Security Logger Middleware — SQL Injection Security Story 7
// Scans all incoming requests for known SQLi attack patterns.
// Blocks malicious requests and logs attempts to security log.
// ─────────────────────────────────────────────────────────────

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
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

    // Console warning (always)
    console.warn(`🛡️ [SECURITY] SQLi attempt blocked from ${event.ip} on ${event.path}`);

    // Append to security log file
    fs.appendFile(securityLogPath, logEntry, (err) => {
        if (err) console.error('Failed to write security log:', err.message);
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
                logSecurityEvent({
                    type: 'SQL_INJECTION_ATTEMPT',
                    severity: 'CRITICAL',
                    ip: req.ip || req.connection?.remoteAddress || 'unknown',
                    method: req.method,
                    path: req.originalUrl,
                    matchedPattern: pattern.toString(),
                    matchedValue: value.substring(0, 200), // Truncate for safety
                    userAgent: req.headers['user-agent'] || 'unknown'
                });

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
                logSecurityEvent({
                    type: 'REQUEST_ABUSE_DETECTED',
                    severity: 'HIGH',
                    ip,
                    method: req.method,
                    path: req.originalUrl,
                    failedRequests: entry.count,
                    window: '5 minutes'
                });
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
}, 10 * 60 * 1000);
