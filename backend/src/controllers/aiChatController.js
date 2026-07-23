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
import { detectEmergency, emergencyResponse, isArabic } from '../ai/safety.js';
import { runBookingFlow, hasBookingIntent } from '../ai/bookingFlow.js';

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
        'SELECT id, user_id, conversation_history, flow_state FROM ai_booking_sessions WHERE id = $1',
        [sessionId]
      );
      if (rows[0]) {
        session = rows[0];
        conversationHistory = rows[0].conversation_history || [];
      }
    }

    if (!session) {
      // Persist a session row for everyone — including guests (user_id nullable) —
      // so multi-turn memory and the booking flow state survive across turns.
      const { rows } = await query(
        `INSERT INTO ai_booking_sessions (user_id, status, conversation_history)
         VALUES ($1, 'active', '[]'::jsonb)
         RETURNING id, user_id, conversation_history, flow_state`,
        [ctx.userId]
      );
      session = rows[0];
    }

    // ─── Build messages (last 20 turns for context) ──
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ].slice(-20);

    const wantsStream = req.headers.accept?.includes('text/event-stream');

    // ─── Deterministic emergency guardrail (before any model call) ───
    // Life-threatening cases must never depend on the model complying.
    if (detectEmergency(message)) {
      const structured = emergencyResponse(message);
      const text = structured.blocks[0].data.content;
      const turns = [
        ...(session.conversation_history || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: text, timestamp: new Date().toISOString() },
      ];
      const finalSessionId = await persistConversation(session, ctx, turns);
      await logTriage(ctx.userId, message, text, [{ tool: 'emergencyGuardrail', args: {}, result: { triggered: true } }]);
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        sendSSE(res, { type: 'session', sessionId: finalSessionId });
        sendSSE(res, { type: 'done', response: structured });
        return res.end();
      }
      return res.json({ sessionId: finalSessionId, response: structured, text });
    }

    const lang = isArabic(message) ? 'ar' : 'en';
    const tools = buildTools(ctx);

    // ─── Hybrid: server-orchestrated booking rail ───
    // Deterministic multi-step booking that works even on small local models.
    // Triggers on booking intent or an in-progress flow; everything else falls
    // through to the model-driven agent below.
    if (session.flow_state?.active || hasBookingIntent(message)) {
      const result = await runBookingFlow({ message, session, ctx, tools, lang });
      const text = result.text || '';
      const turns = [
        ...(session.conversation_history || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: text, timestamp: new Date().toISOString() },
      ];
      const finalSessionId = await persistConversation(session, ctx, turns, result.flow_state);
      await logTriage(ctx.userId, message, text, [{ tool: 'bookingFlow', args: { step: result.flow_state?.step || 'done' } }]);
      const structured = { blocks: result.blocks || [] };
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        sendSSE(res, { type: 'session', sessionId: finalSessionId });
        sendSSE(res, { type: 'done', response: structured });
        return res.end();
      }
      return res.json({ sessionId: finalSessionId, response: structured, text });
    }

    const systemPrompt = getSystemPrompt({ includeRAG: true, includeOnboarding: true });
    if (wantsStream) {
      return await handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools, lang });
    }
    return await handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools, lang });
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
async function persistConversation(session, ctx, turns, flowState) {
  const trimmed = turns.slice(-50);
  const historyJson = JSON.stringify(trimmed);

  const isRealSession = session.id && UUID_RE.test(session.id);
  if (isRealSession) {
    if (flowState !== undefined) {
      await query(
        'UPDATE ai_booking_sessions SET conversation_history = $1::jsonb, flow_state = $2::jsonb, updated_at = NOW() WHERE id = $3',
        [historyJson, JSON.stringify(flowState), session.id]
      );
    } else {
      await query(
        'UPDATE ai_booking_sessions SET conversation_history = $1::jsonb, updated_at = NOW() WHERE id = $2',
        [historyJson, session.id]
      );
    }
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

async function logTriage(userId, symptoms, result, toolResults = []) {
  try {
    // Observability: record which tools ran (name + args) for each turn.
    const toolCalls = (toolResults || []).map(t => ({ tool: t.tool, args: t.args || {} }));
    await query(
      'INSERT INTO ai_triages (user_id, symptoms, result, tool_calls) VALUES ($1, $2, $3, $4::jsonb)',
      [userId || null, symptoms, result, JSON.stringify(toolCalls)]
    );
  } catch (e) {
    // Falls back gracefully if the tool_calls column isn't present yet.
    try {
      await query('INSERT INTO ai_triages (user_id, symptoms, result) VALUES ($1, $2, $3)', [userId || null, symptoms, result]);
    } catch (e2) { console.warn('Failed to log triage:', e2.message); }
  }
}

/**
 * Non-streaming JSON response.
 */
async function handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools, lang = 'en' }) {
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
    responseText = summarizeToolResults(toolResults, lang);
  }
  if (!responseText && toolResults.length === 0) {
    responseText = lang === 'ar'
      ? 'عذرًا، واجهت صعوبة في معالجة ذلك. هل يمكنك إعادة صياغة سؤالك؟'
      : "I'm sorry, I had trouble processing that. Could you rephrase your question?";
  }

  const structuredResponse = buildStructuredResponse(responseText, toolResults, lang);

  const turns = [
    ...(session.conversation_history || []),
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: responseText, toolResults, timestamp: new Date().toISOString() },
  ];
  const finalSessionId = await persistConversation(session, ctx, turns);
  await logTriage(ctx.userId, userMessage, responseText, toolResults);

  res.json({ sessionId: finalSessionId, response: structuredResponse, text: responseText });
}

/**
 * SSE streaming response.
 */
async function handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools, lang = 'en' }) {
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

    if (!fullText && toolResults.length > 0) fullText = summarizeToolResults(toolResults, lang);

    const structuredResponse = buildStructuredResponse(fullText, toolResults, lang);
    sendSSE(res, { type: 'done', response: structuredResponse });

    const turns = [
      ...(session.conversation_history || []),
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullText, toolResults, timestamp: new Date().toISOString() },
    ];
    await persistConversation(session, ctx, turns);
    await logTriage(ctx.userId, userMessage, fullText, toolResults);
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

/** Human-readable fallback summary when the model emits no prose (bilingual). */
function summarizeToolResults(toolResults, lang = 'en') {
  const ar = lang === 'ar';
  const parts = [];
  for (const tr of toolResults) {
    const r = tr.result;
    if (tr.tool === 'searchMedicalGuidelines' && r?.success && r.chunks?.length > 0) {
      parts.push(r.chunks[0].content || (ar ? 'إليك ما وجدته في قاعدة المعرفة البيطرية.' : 'Here is what I found in our veterinary knowledge base.'));
      parts.push(ar
        ? '\n\n⚠️ *هذه معلومات عامة. يُرجى استشارة الطبيب البيطري للحصول على نصيحة خاصة بحيوانك.*'
        : '\n\n⚠️ *This is general information. Please consult your veterinarian for advice specific to your pet.*');
    }
    if (tr.tool === 'createAccount' && r?.success) {
      parts.push(ar
        ? `تم ${r.already_existed ? 'العثور على' : 'إنشاء'} حساب لـ ${r.user?.first_name || 'حضرتك'}.`
        : `Account ${r.already_existed ? 'found' : 'created'} for ${r.user?.first_name || 'you'}.`);
    }
    if (tr.tool === 'bookAppointment' && r?.success) parts.push(ar ? 'تم حجز الموعد بنجاح!' : (r.message || 'Appointment booked successfully!'));
    if (tr.tool === 'findAvailableVets' && r?.success) parts.push(ar ? `وجدت ${r.count} طبيب بيطري متاح.` : `Found ${r.count} available veterinarian(s).`);
    if (tr.tool === 'findMatingPartners' && r?.success) parts.push(ar ? `وجدت ${r.count} شريك تزاوج متوافق.` : `Found ${r.count} compatible mating partner(s).`);
    if (tr.tool === 'findAdoptablePets' && r?.success) parts.push(ar ? `وجدت ${r.count} حيوان متاح للتبني.` : `Found ${r.count} pet(s) available for adoption.`);
    if (tr.tool === 'searchProviders' && r?.success) parts.push(ar ? `وجدت ${r.count} ${r.role === 'trainer' ? 'مدرّب' : 'طبيب بيطري'}.` : `Found ${r.count} ${r.role === 'trainer' ? 'trainer' : 'veterinarian'}(s).`);
  }
  return parts.join('\n') || (ar ? 'لقد عالجت طلبك. كيف يمكنني مساعدتك أكثر؟' : 'I processed your request. How can I help further?');
}

/** Convert text + tool data into typed message blocks for the frontend. */
function buildStructuredResponse(text, toolResults, lang = 'en') {
  const disclaimer = lang === 'ar'
    ? 'هذه معلومات عامة. يُرجى استشارة الطبيب البيطري للحصول على نصيحة خاصة بحيوانك.'
    : 'This is general information. Please consult your veterinarian for advice specific to your pet.';
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
      blocks.push({ type: 'medical_info', data: { chunks: r.chunks, disclaimer } });
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
