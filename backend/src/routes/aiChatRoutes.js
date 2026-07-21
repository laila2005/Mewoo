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

// Use optionalAuth if available, otherwise create a simple passthrough
let optionalAuth;
try {
  const authModule = await import('../middleware/auth.js');
  optionalAuth = authModule.optionalAuth || authModule.default?.optionalAuth;
} catch (e) {
  // Fallback: no auth middleware
  optionalAuth = (req, res, next) => next();
}

// If optionalAuth wasn't found, create a passthrough
if (!optionalAuth) {
  optionalAuth = (req, res, next) => next();
}

const router = express.Router();

// POST /api/ai/chat
router.post('/chat', optionalAuth, chat);

export default router;
