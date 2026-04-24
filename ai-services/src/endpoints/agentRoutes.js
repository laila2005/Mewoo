import express from 'express';
import { runVetTriageAgent } from '../agents/vetTriageAgent.js';

const router = express.Router();

router.post('/triage', async (req, res) => {
    try {
        const { userId, petId, symptoms, userLocation } = req.body;
        
        if (!symptoms) {
            return res.status(400).json({ error: 'Symptoms are required' });
        }

        const agentResponse = await runVetTriageAgent({ userId, petId, symptoms, userLocation });
        
        res.status(200).json({
            success: true,
            response: agentResponse
        });
    } catch (error) {
        console.error('Error running Vet Triage Agent:', error);
        res.status(500).json({ success: false, error: 'Failed to run agent' });
    }
});

export default router;
