/**
 * PetPulse — AI Chat Routes
 * 
 * POST /api/ai/chat — Unified AI chat endpoint
 *   - Accepts: { message: string, sessionId?: string }
 *   - Supports: JSON response or SSE streaming (Accept: text/event-stream)
 *   - Auth: Optional (works for guests and logged-in users)
 */

import express from 'express';
import { chat } from '../controllers/aiChatController.js';

const router = express.Router();

// Simple passthrough middleware for optional auth
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    // Dynamically load auth middleware at request time (not import time)
    const authModule = await import('../middleware/auth.js');
    const authFn = authModule.optionalAuth || authModule.default?.optionalAuth;
    if (authFn) {
      return authFn(req, res, next);
    }
  } catch (e) {
    // Auth middleware not available — continue as guest
  }
  next();
};

// POST /api/ai/chat
router.post('/chat', optionalAuthMiddleware, chat);

export default router;
