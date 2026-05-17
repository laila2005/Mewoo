import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './src/routes/authRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';
import petRoutes from './src/routes/petRoutes.js';
import lostFoundRoutes from './src/routes/lostFoundRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
import providerRoutes from './src/routes/providerRoutes.js';
import communityRoutes from './src/routes/communityRoutes.js';
import bookingRoutes from './src/routes/bookingRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import publicRoutes from './src/routes/publicRoutes.js';
import { sqliProtection, abuseMonitor } from './src/middlewares/securityLogger.js';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '1mb' })); // Limit body size to prevent large payload attacks

// ── Story 5: Secure HTTP Headers ────────────────────────────
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false
}));

// ── Story 7: SQL Injection Detection & Security Logging ─────
app.use('/api/', sqliProtection);
app.use('/api/', abuseMonitor);

// ── Story 8: Rate Limiting — Defense in Depth ───────────────

// General API rate limit (100 requests per 15 minutes)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limit for login (10 attempts per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limit for registration (5 attempts per 15 minutes)
const registerLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Too many registration attempts. Please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Search/filter rate limit (30 requests per minute)
const searchLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    message: { error: 'Too many search requests. Please slow down' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Apply general rate limiter to all API routes
app.use('/api/', apiLimiter);

// Apply stricter rate limits to sensitive endpoints
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/register', registerLimiter);
app.use('/api/services', searchLimiter);
app.use('/api/providers', searchLimiter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'client', 'src')));

// Serve backend uploads (like avatars)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// Serve admin panel static files
app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'PetPulse Backend running' });
});

// ── Story 5: Global Error Handler ───────────────────────────
// Catches all unhandled errors. Returns a generic message to the
// client and logs full details server-side only.
// This ensures no DB schema, stack traces, or SQL errors leak.
app.use((err, req, res, next) => {
    // Log full error details server-side
    console.error('[GLOBAL ERROR HANDLER]', {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.originalUrl,
        error: err.message,
        stack: err.stack
    });

    // Never expose internal details to the client
    res.status(err.status || 500).json({
        error: 'Something went wrong.'
    });
});

app.listen(PORT, () => {
    console.log(`PetPulse Backend running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}/pages/login.html`);
});
