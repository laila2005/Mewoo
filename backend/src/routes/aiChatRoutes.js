/**
 * PetPulse — AI Chat + Autopilot Routes
 *
 * POST  /api/ai/chat        — Unified AI chat (JSON or SSE). Optional auth.
 * POST  /api/ai/jobs/run    — Run Autopilot jobs (cron-guarded). Phase 2.
 * PATCH /api/ai/autopilot   — Toggle the user's full-auto opt-in. Requires auth.
 */

import express from 'express';
import { chat } from '../controllers/aiChatController.js';
import { optionalAuth, requireAuth } from '../middlewares/authMiddleware.js';
import { runAllJobs } from '../ai/autopilot.js';
import { query } from '../config/db.js';

const router = express.Router();

// Lightweight in-memory sliding-window rate limiter for the chat endpoint.
// Per-instance (fine as a basic abuse/cost guard); keyed by user id or IP.
const _rlHits = new Map(); // id -> timestamps[]
const RL_WINDOW_MS = 60_000;
const RL_MAX = Number(process.env.AI_CHAT_RATE_LIMIT) || 20;
function rateLimitChat(req, res, next) {
  const id = req.user?.id || req.ip || 'anon';
  const now = Date.now();
  const recent = (_rlHits.get(id) || []).filter(t => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: "You're sending messages too fast. Please wait a moment and try again." });
  }
  recent.push(now);
  _rlHits.set(id, recent);
  if (_rlHits.size > 5000) { // opportunistic cleanup of idle keys
    for (const [k, v] of _rlHits) { if (!v.some(t => now - t < RL_WINDOW_MS)) _rlHits.delete(k); }
  }
  next();
}

// POST /api/ai/chat  (optionalAuth first so the limiter can key on user id)
router.post('/chat', optionalAuth, rateLimitChat, chat);

// Guard the jobs endpoint: require CRON_SECRET in prod; allow locally if unset.
function cronGuard(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.VERCEL) return res.status(401).json({ error: 'CRON_SECRET not configured' });
    return next(); // local dev convenience
  }
  const provided = req.headers['x-cron-secret'] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (provided === secret) return next();
  return res.status(401).json({ error: 'Unauthorized' });
}

// /api/ai/jobs/run — proactive Autopilot (vaccination reminders/auto-booking, appt reminders).
// GET + POST: Vercel Cron issues GET; manual/API triggers can POST options.
async function runJobsHandler(req, res) {
  try {
    const summary = await runAllJobs(req.body || {});
    res.json({ ok: true, summary });
  } catch (err) {
    console.error('Autopilot jobs error:', err);
    res.status(500).json({ error: 'Autopilot run failed.' });
  }
}
router.get('/jobs/run', cronGuard, runJobsHandler);
router.post('/jobs/run', cronGuard, runJobsHandler);

// PATCH /api/ai/autopilot — opt in/out of FULL auto-booking
router.patch('/autopilot', requireAuth, async (req, res) => {
  try {
    const optIn = !!req.body?.opt_in;
    await query('UPDATE users SET autopilot_opt_in = $1 WHERE id = $2', [optIn, req.user.id]);
    res.json({ ok: true, autopilot_opt_in: optIn });
  } catch (err) {
    console.error('Autopilot opt-in error:', err);
    res.status(500).json({ error: 'Could not update autopilot preference.' });
  }
});

export default router;
