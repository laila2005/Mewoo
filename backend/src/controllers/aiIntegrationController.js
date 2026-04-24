import { requireAuth } from '../middlewares/authMiddleware.js';

// This is a bridge controller. 
// It receives the request from the mobile app, validates the user token via requireAuth,
// and then securely forwards the request to the internal ai-services microservice (Port 5001).

export const triageBridge = async (req, res) => {
    try {
        const { symptoms, petId, userLocation } = req.body;
        const userId = req.user.id; // Extracted from JWT by requireAuth middleware

        if (!symptoms) {
            return res.status(400).json({ error: 'Symptoms are required for triage' });
        }

        // Forward to the internal AI service
        // In production, AI_SERVICE_URL should be an internal docker network URL (e.g., http://ai_service:5001)
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
        
        const aiResponse = await fetch(`${aiServiceUrl}/api/agents/triage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Internal API key could be added here for microservice security
            },
            body: JSON.stringify({
                userId,
                petId,
                symptoms,
                userLocation
            })
        });

        if (!aiResponse.ok) {
            throw new Error(`AI Service responded with status: ${aiResponse.status}`);
        }

        const data = await aiResponse.json();
        
        res.status(200).json(data);

    } catch (error) {
        console.error('Error bridging to AI service:', error);
        res.status(500).json({ error: 'Failed to communicate with AI triage service' });
    }
};
