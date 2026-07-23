/**
 * PetPulse — AI Chat Routes
 *
 * POST /api/ai/chat — Unified AI chat endpoint
 *   - Accepts: { message: string, sessionId?: string }
 *   - Supports: JSON response or SSE streaming (Accept: text/event-stream)
 *   - Auth: Optional — works for guests and logged-in users. When a valid
 *           Bearer token is present, req.user is populated so the server can
 *           own identity for tool actions and persist conversation memory.
 */

import express from 'express';
import { chat } from '../controllers/aiChatController.js';
import { optionalAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

// POST /api/ai/chat
router.post('/chat', optionalAuth, chat);

export default router;
