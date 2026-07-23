/**
 * PetPulse — AI Chat Controller
 *
 *   - Multi-step tool calling (Task 1.4)
 *   - Conversation memory via ai_booking_sessions (Task 1.4)
 *   - Intent-aware system prompt (Task 2.2)
 *   - SSE streaming (Task 2.3)
 *   - Structured JSON responses (Task 2.3)
 *
 * Backed by the shared pg pool (config/db.js) — same production database as the
 * rest of the app. Identity is server-owned (req.user from the verified JWT or
 * the account created during guest onboarding), never taken from the model.
 */

import { query } from '../config/db.js';
import { generateAIResponse, streamAIResponse, getMaxSteps } from '../ai/llmClient.js';
import { buildTools } from '../ai/tools.js';
import { getSystemPrompt } from '../ai/systemPrompts.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/ai/chat
 * Body: { message: string, sessionId?: string }
 * Headers: Authorization (optional), Accept: text/event-stream (for SSE)
 */
export async function chat(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
    }

    // ─── Server-owned identity context (shared with the tools) ───
    const ctx = { userId: req.user?.id || null };

    // ─── Session Management ──────────────────────────
    let session = null;
    let conversationHistory = [];

    if (sessionId && UUID_RE.test(sessionId)) {
      const { rows } = await query(
        'SELECT id, user_id, conversation_history FROM ai_booking_sessions WHERE id = $1',
        [sessionId]
      );
      if (rows[0]) {
        session = rows[0];
        conversationHistory = rows[0].conversation_history || [];
      }
    }

    if (!session) {
      if (ctx.userId) {
        // Authenticated user — persist a real session row.
        const { rows } = await query(
          `INSERT INTO ai_booking_sessions (user_id, status, conversation_history)
           VALUES ($1, 'active', '[]'::jsonb)
           RETURNING id, user_id, conversation_history`,
          [ctx.userId]
        );
        session = rows[0];
      } else {
        // Guest — ephemeral in-memory session (may be persisted post-onboarding).
        session = { id: 'guest-' + Date.now(), conversation_history: [] };
      }
    }

    // ─── Build messages (last 20 turns for context) ──
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ].slice(-20);

    const systemPrompt = getSystemPrompt({ includeRAG: true, includeOnboarding: true });
    const tools = buildTools(ctx);

    const wantsStream = req.headers.accept?.includes('text/event-stream');
    if (wantsStream) {
      return await handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools });
    }
    return await handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools });
  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({
      error: 'AI service temporarily unavailable.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/**
 * Persist the conversation. If a guest created an account mid-conversation,
 * upgrade the ephemeral session into a real row so memory carries forward.
 * Returns the (possibly new) session id.
 */
async function persistConversation(session, ctx, turns) {
  const trimmed = turns.slice(-50);
  const historyJson = JSON.stringify(trimmed);

  const isRealSession = session.id && UUID_RE.test(session.id);
  if (isRealSession) {
    await query(
      'UPDATE ai_booking_sessions SET conversation_history = $1::jsonb, updated_at = NOW() WHERE id = $2',
      [historyJson, session.id]
    );
    return session.id;
  }

  // Guest became known during this turn — create a persistent session now.
  if (ctx.userId) {
    try {
      const { rows } = await query(
        `INSERT INTO ai_booking_sessions (user_id, status, conversation_history)
         VALUES ($1, 'active', $2::jsonb)
         RETURNING id`,
        [ctx.userId, historyJson]
      );
      return rows[0].id;
    } catch (e) {
      console.warn('Could not upgrade guest session:', e.message);
    }
  }
  return session.id; // remains ephemeral
}

async function logTriage(userId, symptoms, result) {
  try {
    await query(
      'INSERT INTO ai_triages (user_id, symptoms, result) VALUES ($1, $2, $3)',
      [userId || null, symptoms, result]
    );
  } catch (e) {
    console.warn('Failed to log triage:', e.message);
  }
}

/**
 * Non-streaming JSON response.
 */
async function handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools }) {
  let toolResults = [];
  let responseText = '';

  try {
    const result = await generateAIResponse({ system: systemPrompt, messages, tools, maxSteps: getMaxSteps() });
    toolResults = extractToolResults(result);
    responseText = result.text || '';
    if (!responseText && result.steps?.length > 0) {
      responseText = result.steps[result.steps.length - 1].text || '';
    }
  } catch (aiError) {
    console.warn('AI generation error (recovering):', aiError.message?.substring(0, 120));
    // Recover tool results the model completed before failing to emit text.
    if (aiError.completedSteps?.length > 0) {
      for (const step of aiError.completedSteps) {
        for (const tc of step.toolCalls || []) {
          const match = step.toolResults?.find(tr => tr.toolCallId === tc.toolCallId);
          toolResults.push({ tool: tc.toolName, args: tc.args, result: match?.output || match?.result || null });
        }
      }
    }
  }

  // Summarize from tool results when the model produced no text.
  if (!responseText && toolResults.length > 0) {
    responseText = summarizeToolResults(toolResults);
  }
  if (!responseText && toolResults.length === 0) {
    responseText = "I'm sorry, I had trouble processing that. Could you rephrase your question?";
  }

  const structuredResponse = buildStructuredResponse(responseText, toolResults);

  const turns = [
    ...(session.conversation_history || []),
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: responseText, toolResults, timestamp: new Date().toISOString() },
  ];
  const finalSessionId = await persistConversation(session, ctx, turns);
  await logTriage(ctx.userId, userMessage, responseText);

  res.json({ sessionId: finalSessionId, response: structuredResponse, text: responseText });
}

/**
 * SSE streaming response.
 */
async function handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools }) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Session-Id', session.id);
  res.flushHeaders?.();

  sendSSE(res, { type: 'session', sessionId: session.id });

  let fullText = '';
  const toolResults = [];

  try {
    const result = await streamAIResponse({ system: systemPrompt, messages, tools, maxSteps: getMaxSteps() });

    for await (const chunk of result.textStream) {
      fullText += chunk;
      sendSSE(res, { type: 'token', content: chunk });
    }

    // In AI SDK v5+, streamText exposes steps/text as awaitable promises.
    const steps = (await result.steps) || [];
    if (!fullText) { try { fullText = (await result.text) || ''; } catch { /* ignore */ } }
    for (const step of steps) {
      for (const tc of step.toolCalls || []) {
        const match = step.toolResults?.find(tr => tr.toolCallId === tc.toolCallId);
        toolResults.push({ tool: tc.toolName, args: tc.args, result: match?.output || match?.result || null });
        sendSSE(res, { type: 'tool_call', tool: tc.toolName, status: 'completed' });
      }
    }

    if (!fullText && toolResults.length > 0) fullText = summarizeToolResults(toolResults);

    const structuredResponse = buildStructuredResponse(fullText, toolResults);
    sendSSE(res, { type: 'done', response: structuredResponse });

    const turns = [
      ...(session.conversation_history || []),
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullText, toolResults, timestamp: new Date().toISOString() },
    ];
    await persistConversation(session, ctx, turns);
    await logTriage(ctx.userId, userMessage, fullText);
  } catch (streamErr) {
    console.error('Streaming error:', streamErr);
    sendSSE(res, { type: 'error', message: 'AI response interrupted.' });
  }

  res.end();
}

/** Extract tool call + result pairs from a generateText result. */
function extractToolResults(result) {
  const out = [];
  const steps = Array.isArray(result.steps) ? result.steps : [];
  for (const step of steps) {
    for (const tc of step.toolCalls || []) {
      const match = step.toolResults?.find(tr => tr.toolCallId === tc.toolCallId);
      out.push({ tool: tc.toolName, args: tc.args, result: match?.output || match?.result || null });
    }
  }
  // Legacy shape fallback.
  if (out.length === 0 && result.toolCalls) {
    for (const tc of result.toolCalls) {
      const match = result.toolResults?.find(tr => tr.toolCallId === tc.toolCallId);
      out.push({ tool: tc.toolName, args: tc.args, result: match?.output || match?.result || null });
    }
  }
  return out;
}

/** Human-readable fallback summary when the model emits no prose. */
function summarizeToolResults(toolResults) {
  const parts = [];
  for (const tr of toolResults) {
    const r = tr.result;
    if (tr.tool === 'searchMedicalGuidelines' && r?.success && r.chunks?.length > 0) {
      parts.push(r.chunks[0].content || 'Here is what I found in our veterinary knowledge base.');
      parts.push('\n\n⚠️ *This is general information. Please consult your veterinarian for advice specific to your pet.*');
    }
    if (tr.tool === 'createAccount' && r?.success) {
      parts.push(`Account ${r.already_existed ? 'found' : 'created'} for ${r.user?.first_name || 'you'}.`);
    }
    if (tr.tool === 'bookAppointment' && r?.success) parts.push(r.message || 'Appointment booked successfully!');
    if (tr.tool === 'findAvailableVets' && r?.success) parts.push(`Found ${r.count} available veterinarian(s).`);
    if (tr.tool === 'findMatingPartners' && r?.success) parts.push(`Found ${r.count} compatible mating partner(s).`);
    if (tr.tool === 'findAdoptablePets' && r?.success) parts.push(`Found ${r.count} pet(s) available for adoption.`);
    if (tr.tool === 'searchProviders' && r?.success) parts.push(`Found ${r.count} ${r.role === 'trainer' ? 'trainer' : 'veterinarian'}(s).`);
  }
  return parts.join('\n') || 'I processed your request. How can I help further?';
}

/** Convert text + tool data into typed message blocks for the frontend. */
function buildStructuredResponse(text, toolResults) {
  const blocks = [];
  for (const tr of toolResults) {
    const r = tr.result;
    if (tr.tool === 'bookAppointment' && r?.success) {
      blocks.push({ type: 'booking_confirmation', data: { appointment: r.appointment, message: r.message } });
    }
    if (tr.tool === 'createAccount' && r?.success && !r.already_existed) {
      blocks.push({ type: 'account_created', data: { user: r.user, temporary_password: r.temporary_password, isGuest: true } });
    }
    if (tr.tool === 'findAvailableVets' && r?.success) {
      blocks.push({ type: 'vet_list', data: { vets: r.vets, count: r.count } });
    }
    if (tr.tool === 'searchMedicalGuidelines' && r?.success && r.chunks?.length > 0) {
      blocks.push({
        type: 'medical_info',
        data: { chunks: r.chunks, disclaimer: 'This is general information. Please consult your veterinarian for advice specific to your pet.' },
      });
    }
    if (tr.tool === 'findMatingPartners' && r?.success && r.matches?.length > 0) {
      blocks.push({ type: 'mating_match', data: { matches: r.matches, count: r.count } });
    }
    if (tr.tool === 'findAdoptablePets' && r?.success && r.pets?.length > 0) {
      blocks.push({ type: 'adoption', data: { pets: r.pets, count: r.count } });
    }
    if (tr.tool === 'searchProviders' && r?.success && r.providers?.length > 0) {
      blocks.push({ type: 'provider_list', data: { providers: r.providers, role: r.role, count: r.count } });
    }
    if (tr.tool === 'navigateTo' && r?.success) {
      blocks.push({ type: 'navigation', data: { route: r.route, label: r.label } });
    }
  }
  if (text && text.trim()) blocks.push({ type: 'text', data: { content: text } });
  return { blocks };
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default { chat };
