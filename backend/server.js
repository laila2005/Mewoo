import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { initSocketHandler } from './src/sockets/socketHandler.js';
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
import chatRoutes from './src/routes/chatRoutes.js';
import messageRoutes from './src/routes/messageRoutes.js';
import userRoutes from './src/routes/userRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import uploadRoutes from './src/routes/uploadRoutes.js';
import adoptionRoutes from './src/routes/adoptionRoutes.js';
import matingRoutes from './src/routes/matingRoutes.js';
import vendorRoutes from './src/routes/vendorRoutes.js';
import { sqliProtection, abuseMonitor } from './src/middlewares/securityLogger.js';
dotenv.config();

import { query } from './src/config/db.js';

async function initExtendedColumns() {
    try {
        console.log('Synchronizing extended vet/trainer profile columns in database...');
        // vet_profiles
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS title VARCHAR(255);');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS specialties TEXT[];');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS degrees TEXT;');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0;');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS address VARCHAR(255);');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS available_days TEXT[];');
        await query('ALTER TABLE vet_profiles ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT \'{"start": "09:00", "end": "18:00"}\'::jsonb;');

        // trainer_profiles
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS title VARCHAR(255);');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS experience INTEGER DEFAULT 0;');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS degrees TEXT;');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS consultation_fee NUMERIC DEFAULT 0;');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS address VARCHAR(255);');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS available_days TEXT[];');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS working_hours JSONB DEFAULT \'{"start": "09:00", "end": "18:00"}\'::jsonb;');
        await query('ALTER TABLE trainer_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100);');

        // adoption_applications
        await query('ALTER TABLE adoption_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;');

        console.log('✅ Database extended columns synced successfully.');
    } catch (err) {
        console.error('Error synchronizing database schema extensions:', err.message);
    }
}
// Avoid running database schema-extension queries on Vercel serverless cold starts.
if (!process.env.VERCEL) {
    initExtendedColumns();
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Vercel)
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
app.set('io', io);
initSocketHandler(io);

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

// General API rate limit (increased for testing/dev environments)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Strict rate limit for login (10 attempts per 15 minutes)
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // Temporarily increased to allow immediate developer testing
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

import hostRoutes from './src/routes/hostRoutes.js';

// Health Check
app.get(['/health', '/api/health'], (req, res) => {
    res.status(200).json({ status: 'PetPulse Backend running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);

// Lazy-load AI chat routes to prevent AI module failures from crashing the entire server
(async () => {
  try {
    const aiChatRoutes = (await import('./src/routes/aiChatRoutes.js')).default;
    app.use('/api/ai', aiChatRoutes);
    console.log('✅ AI Chat routes loaded');
  } catch (err) {
    console.warn('⚠️ AI Chat routes failed to load (AI features unavailable):', err.message);
  }
})();
app.use('/api/pets', petRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/adoptions', adoptionRoutes);
app.use('/api/mating', matingRoutes);
app.use('/api/hosts', hostRoutes);
app.use('/api/vendor', vendorRoutes);

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

if (!process.env.VERCEL) {
    server.listen(PORT, () => {
        console.log(`PetPulse Backend running on http://localhost:${PORT}`);
        console.log(`Frontend available at http://localhost:${PORT}/pages/login.html`);
    });
}

export default app;
