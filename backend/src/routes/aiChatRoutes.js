/**
 * PetPluse — AI Chat + Autopilot Routes
 *
 * POST  /api/ai/chat        — Unified AI chat (JSON or SSE). Optional auth.
 * POST  /api/ai/jobs/run    — Run Autopilot jobs (cron-guarded). Phase 2.
 * PATCH /api/ai/autopilot   — Toggle the user's full-auto opt-in. Requires auth.
 */

import express from 'express';
import { chat, submitFeedback } from '../controllers/aiChatController.js';
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

// GET /api/ai/health — is the assistant actually able to reach a model?
//
// Exists because an unreachable provider is invisible from the outside: the
// chat endpoint catches the failure, falls back to the knowledge base, and
// returns 200 either way. That is right for a user and useless for an
// operator, who then cannot tell "answered from the KB" from "the model has
// been down for a week".
//
// Deliberately returns no secret — the provider NAME and whether a key is
// present, never the key, never a partial key.
router.get('/health', async (req, res) => {
  const provider = (process.env.AI_PROVIDER || '').trim().toLowerCase();
  const out = {
    provider: provider || '(unset — defaults to ollama, which does not exist on serverless)',
    keyPresent: provider === 'groq' ? !!(process.env.GROQ_API_KEY || '').trim() : null,
    // reported after the retired-model guard, so this is the model that will
    // actually be used rather than what the env var happens to say
    model: null,
    configuredModel: (process.env.GROQ_MODEL || '').trim() || '(unset)',
    reachable: null,
    error: null,
  };

  // A real, minimal generation. Capped at a couple of tokens, so probing is
  // close to free but still proves the round trip end to end.
  try {
    const { generateAIResponse, isMockProvider, getProviderInfo } = await import('../ai/llmClient.js');
    try { out.model = getProviderInfo()?.model || null; } catch { /* reported below */ }
    if (isMockProvider()) {
      out.reachable = true;
      out.note = 'mock provider — no external call made';
      return res.json(out);
    }
    const t0 = Date.now();
    const r = await generateAIResponse({
      system: 'Reply with the single word: ok',
      messages: [{ role: 'user', content: 'ping' }],
      maxSteps: 1,
      maxOutputTokens: 4,
    });
    out.reachable = true;
    out.ms = Date.now() - t0;
    out.sample = String(r?.text || '').slice(0, 40);
  } catch (err) {
    out.reachable = false;
    // The provider's own message is what an operator needs — a deprecated
    // model name and an invalid key look identical from the outside otherwise.
    out.error = String(err?.message || err).slice(0, 300);
  }
  res.json(out);
});

// POST /api/ai/feedback — thumbs up/down on a reply
router.post('/feedback', optionalAuth, submitFeedback);

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
