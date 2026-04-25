import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import agentRoutes from './endpoints/agentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/agents', agentRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'AI Services running' });
});

app.listen(PORT, () => {
    console.log(`PetPulse AI Services running on port ${PORT}`);
});
