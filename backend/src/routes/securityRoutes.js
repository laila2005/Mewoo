/**
 * PetPluse — Security Agent routes
 *
 * POST /api/security/analyze — classify a security event on demand.
 *
 * ADMIN ONLY. This endpoint spends model tokens on caller-supplied input, so it
 * is an abuse and cost vector if left open; it exists for admin inspection and
 * for exercising the agent, not as a public API.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { analyzeSecurityEvent } from '../ai/securityAgent.js';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Second line of defence behind requireAdmin: even a logged-in admin cannot
// loop this endpoint into a large model bill.
const analyzeLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: Number(process.env.SECURITY_AGENT_ROUTE_LIMIT) || 20,
    message: { error: 'Too many security analysis requests. Please wait and try again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/analyze', requireAuth, requireAdmin, analyzeLimiter, async (req, res) => {
    try {
        // analyzeSecurityEvent allowlists the fields it forwards to the model,
        // so an arbitrary body cannot smuggle extra content into the prompt.
        const analysis = await analyzeSecurityEvent(req.body);
        return res.status(200).json({ success: true, analysis });
    } catch (error) {
        console.error('Security Agent error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to analyze security event' });
    }
});

export default router;
