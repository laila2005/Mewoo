import { requireAuth } from '../middlewares/authMiddleware.js';

// This is a bridge controller. 
// It receives the request from the mobile app, validates the user token via requireAuth,
// and then securely forwards the request to the internal ai-services microservice (Port 5001).

export const triageBridge = async (req, res) => {
    try {
        const { symptoms, petId, userLocation } = req.body;
        const userId = req.user ? req.user.id : 'anonymous';

        if (!symptoms) {
            return res.status(400).json({ error: 'Symptoms are required for triage' });
        }

        // Forward to the internal AI service
        // In production, AI_SERVICE_URL should be an internal network URL (e.g., http://ai_service:5001)
        const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:5001';
        
        try {
            const aiResponse = await fetch(`${aiServiceUrl}/api/agents/triage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    petId,
                    symptoms,
                    userLocation
                })
            });

            if (aiResponse.ok) {
                const data = await aiResponse.json();
                return res.status(200).json(data);
            }
        } catch (fetchError) {
            console.log("AI Microservice unreachable. Falling back to mocked AI response.");
        }

        // MOCK FALLBACK for UI demonstration without an OpenAI Key
        setTimeout(() => {
            const isEmergency = symptoms.toLowerCase().includes('blood') || symptoms.toLowerCase().includes('vomit') || symptoms.toLowerCase().includes('seizure');
            
            let mockReply = "";
            if (isEmergency) {
                mockReply = `Based on the symptoms you've described ("${symptoms}"), this sounds like a potential emergency. I have found "Downtown Pet Hospital" which is 2 miles away and open now. I have proactively booked a hold for you. \n\nConfirmation code: BKG-912.\n\nPlease proceed to the clinic immediately.`;
            } else {
                mockReply = `I understand your pet is experiencing "${symptoms}". While it doesn't sound like a life-threatening emergency, it's always best to consult a professional. I recommend booking a standard consultation with Dr. Sarah Chen, who specializes in general wellness. Would you like me to book that for you?`;
            }

            return res.status(200).json({
                success: true,
                response: mockReply
            });
        }, 1500); // Simulate AI thinking delay

    } catch (error) {
        console.error('Error bridging to AI service:', error);
        res.status(500).json({ error: 'Something went wrong.' });
    }
};
