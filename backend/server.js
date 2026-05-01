import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/authRoutes.js';
import aiRoutes from './src/routes/aiRoutes.js';
import petRoutes from './src/routes/petRoutes.js';
import lostFoundRoutes from './src/routes/lostFoundRoutes.js';
import serviceRoutes from './src/routes/serviceRoutes.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/services', serviceRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'PetPulse Backend running' });
});

app.listen(PORT, () => {
    console.log(`PetPulse Backend running on port ${PORT}`);
});
