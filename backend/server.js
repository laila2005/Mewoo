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
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Gateway Security - Active Threat Protection
app.use(helmet({
    contentSecurityPolicy: false // Disabled locally so frontend assets load correctly without complex CSP setup
})); // Secure HTTP headers against XSS and sniffing

// DDoS Protection: Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per 15 minutes
    message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Apply rate limiter to all API routes
app.use('/api/', apiLimiter);

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..', 'client', 'src')));

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

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'PetPulse Backend running' });
});

app.listen(PORT, () => {
    console.log(`PetPulse Backend running on http://localhost:${PORT}`);
    console.log(`Frontend available at http://localhost:${PORT}/pages/login.html`);
});
