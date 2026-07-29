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
import { generateAIResponse, streamAIResponse, getMaxSteps, pickModel, describePetPhoto } from '../ai/llmClient.js';
import { buildTools } from '../ai/tools.js';
import { getSystemPrompt } from '../ai/systemPrompts.js';
import { detectEmergency, emergencyResponse, detectUrgent, urgentResponse, isArabic } from '../ai/safety.js';
import { runBookingFlow, hasBookingIntent } from '../ai/bookingFlow.js';
import { isFeatureEnabled } from '../config/featureFlags.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/ai/feedback — thumbs up/down on a VetAI reply (quality signal).
 * Body: { sessionId?, rating: 1 | -1, excerpt? }
 */
export const submitFeedback = async (req, res) => {
  try {
    const rating = Number(req.body?.rating);
    if (rating !== 1 && rating !== -1) {
      return res.status(400).json({ error: 'rating must be 1 or -1.' });
    }
    const sessionId = (req.body?.sessionId && UUID_RE.test(req.body.sessionId)) ? req.body.sessionId : null;
    const excerpt = typeof req.body?.excerpt === 'string' ? req.body.excerpt.slice(0, 500) : null;
    await query(
      'INSERT INTO ai_feedback (user_id, session_id, rating, message_excerpt) VALUES ($1, $2, $3, $4)',
      [req.user?.id || null, sessionId, rating, excerpt]
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('AI feedback error:', error);
    res.status(500).json({ error: 'Could not record feedback.' });
  }
};

/**
 * POST /api/ai/chat
 * Body: { message: string, sessionId?: string }
 * Headers: Authorization (optional), Accept: text/event-stream (for SSE)
 */
export async function chat(req, res) {
  try {
    const { sessionId } = req.body;
    // A photo may arrive with an empty caption — default a friendly prompt so the
    // rest of the pipeline (which requires text) still works.
    const hasPhoto = typeof req.body.image_url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(req.body.image_url);
    let message = req.body.message;
    if ((!message || typeof message !== 'string' || message.trim().length === 0)) {
      if (hasPhoto) message = 'Please take a look at this photo of my pet.';
      else return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
    }

    // ─── Server-owned identity context (shared with the tools) ───
    const ctx = { userId: req.user?.id || null };

    // Optional symptom photo — restricted to our Cloudinary origin (no SSRF via
    // arbitrary URLs handed to the vision model).
    const imageUrl = (typeof req.body.image_url === 'string' && /^https:\/\/res\.cloudinary\.com\//.test(req.body.image_url))
      ? req.body.image_url : null;

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

    // ─── Build messages (compact recent context to bound tokens/latency) ──
    // Send only the last N turns, and cap any single message's length so a huge
    // pasted block can't blow the context window.
    const HISTORY_WINDOW = 12;
    const MAX_MSG_CHARS = 2000;
    const messages = [
      ...conversationHistory.map(m => ({ role: m.role, content: String(m.content ?? '').slice(0, MAX_MSG_CHARS) })),
      { role: 'user', content: message },
    ].slice(-HISTORY_WINDOW);

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
    const hasEmail = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(message);

    // ─── Photo/symptom intake (assist, NEVER diagnose) ───
    // Runs after the life-threatening emergency guardrail. Analyzes the photo with
    // a vision model if one is configured; otherwise a safe acknowledgment. Always
    // ends with a disclaimer + Book-a-Vet CTA — no photo-based diagnosis.
    if (imageUrl) {
      // Respect the conversation language even for a caption-less photo — the client
      // sends an English placeholder caption, so `lang` alone would force English.
      const lastUserAr = isArabic([...(session.conversation_history || [])].reverse().find(m => m.role === 'user')?.content || '');
      const photoLang = isArabic(message) ? 'ar' : (session.flow_state?.lang || (lastUserAr ? 'ar' : 'en'));
      const visionText = await describePetPhoto(imageUrl, message, photoLang);
      const disclaimer = photoLang === 'ar'
        ? 'ملاحظة: لا أستطيع تشخيص الحالة من صورة. لأي أمر مقلق، يُرجى أن يفحص طبيب بيطري حيوانك.'
        : "Note: I can't diagnose from a photo. For anything concerning, please have a vet examine your pet.";
      const lead = visionText
        ? (photoLang === 'ar' ? `بناءً على الصورة: ${visionText}` : `From the photo: ${visionText}`)
        : (photoLang === 'ar'
            ? 'شكرًا على الصورة. لا أستطيع تقييم الصور بدقة، لكن يسعدني مساعدتك في فحص حيوانك لدى طبيب بيطري.'
            : "Thanks for the photo. I can't reliably assess images, but I can help you get your pet seen by a vet.");
      const content = `${lead}\n\n${disclaimer}`;
      const photoBlocks = [{ type: 'text', data: { content } }];
      // Only offer the Book-a-Vet CTA when vet booking is actually live.
      if (await isFeatureEnabled('vets')) {
        photoBlocks.push({ type: 'navigation', data: { route: '/explore', label: photoLang === 'ar' ? 'احجز مع طبيب بيطري' : 'Book a Vet' } });
      }
      const structured = { blocks: photoBlocks };
      const turns = [
        ...(session.conversation_history || []),
        { role: 'user', content: `${message} [photo attached]`, timestamp: new Date().toISOString() },
        { role: 'assistant', content, timestamp: new Date().toISOString() },
      ];
      const finalSessionId = await persistConversation(session, ctx, turns);
      await logTriage(ctx.userId, `${message} [photo]`, content, [{ tool: 'photoIntake', args: {}, result: { hasVision: !!visionText } }]);
      if (wantsStream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();
        sendSSE(res, { type: 'session', sessionId: finalSessionId });
        sendSSE(res, { type: 'done', response: structured });
        return res.end();
      }
      return res.json({ sessionId: finalSessionId, response: structured, text: content });
    }

    // ─── Deterministic "urgent" severity tier (before the model) ───
    // Needs-a-vet-soon symptoms get a clear, cautious response + booking CTA —
    // but never hijack an in-progress booking or an explicit booking request.
    if (!session.flow_state?.active && !hasBookingIntent(message) && detectUrgent(message)) {
      const structured = urgentResponse(message, { canBook: await isFeatureEnabled('vets') });
      const text = structured.blocks[0].data.content;
      const turns = [
        ...(session.conversation_history || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: text, timestamp: new Date().toISOString() },
      ];
      const finalSessionId = await persistConversation(session, ctx, turns);
      await logTriage(ctx.userId, message, text, [{ tool: 'urgentGuardrail', args: {}, result: { tier: 'urgent' } }]);
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

    // Shared responder for the deterministic branches below (cancel / account).
    const finishTurn = async (structured, text, flowState) => {
      const turns = [
        ...(session.conversation_history || []),
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: text, timestamp: new Date().toISOString() },
      ];
      const finalSessionId = await persistConversation(session, ctx, turns, flowState);
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
    };

    // Escape hatch: let the user bail out of an in-progress flow instead of having
    // every subsequent message swallowed by it (and clear the persisted flow_state).
    const wantsCancel = /\b(cancel|stop|never ?mind|start over|forget it|nvm)\b/i.test(message) || /إلغاء|ألغِ|توقف|ابدأ من جديد/.test(message);
    if (session.flow_state?.active && wantsCancel) {
      const content = lang === 'ar' ? 'تمام، ألغيت ذلك. كيف أقدر أساعدك؟' : "Okay, I've cancelled that. How else can I help?";
      return finishTurn({ blocks: [{ type: 'text', data: { content } }] }, content, { active: false });
    }

    // Standalone account creation is NOT vet booking — point guests to the sign-up
    // page instead of diverting them into the booking script (observed misrouting).
    const wantsAccount = /\b(create|make|set ?up|open|register)\b[^.]{0,15}\baccount\b|\bsign me up\b|\bregister me\b/i.test(message) || /أنشئ (لي )?حساب|إنشاء حساب|سجّ?لني/.test(message);
    if (!ctx.userId && wantsAccount && !hasBookingIntent(message) && !session.flow_state?.active) {
      const content = lang === 'ar'
        ? 'يمكنك إنشاء حسابك في ثوانٍ من صفحة التسجيل — أو أخبرني إن أردت حجز موعد وسأتكفّل بإنشاء الحساب أثناء الحجز.'
        : "You can create your account in seconds on the sign-up page — or tell me if you'd like to book an appointment and I'll set the account up along the way.";
      return finishTurn({
        blocks: [
          { type: 'navigation', data: { route: '/signup', label: lang === 'ar' ? 'إنشاء حساب' : 'Create account' } },
          { type: 'text', data: { content } },
        ],
      }, content, { active: false });
    }

    // ─── Hybrid: server-orchestrated action rail ───
    // Account creation + booking run DETERMINISTICALLY here (LLM used only to
    // extract fields, tools invoked directly) — this is immune to Groq's flaky
    // tool-call validation for write tools. Triggers on booking intent or an
    // in-progress flow. (A bare email no longer force-starts a booking.)
    if (session.flow_state?.active || hasBookingIntent(message)) {
      // Soft-launch: vet booking isn't live yet — don't run the booking flow.
      if (!(await isFeatureEnabled('vets'))) {
        const content = lang === 'ar'
          ? 'حجز الأطباء البيطريين سيتوفر قريبًا — نعمل على انضمام أطباء موثوقين. حتى ذلك الحين جرّب المفقودات، التبنّي، أو المجتمع! 🐾'
          : "Vet booking is coming soon — we're onboarding verified vets. In the meantime, try Lost & Found, Adoption, or the Community! 🐾";
        const structured = { blocks: [{ type: 'text', data: { content } }] };
        const turns = [
          ...(session.conversation_history || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content, timestamp: new Date().toISOString() },
        ];
        const finalSessionId = await persistConversation(session, ctx, turns, { active: false });
        if (wantsStream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders?.();
          sendSSE(res, { type: 'session', sessionId: finalSessionId });
          sendSSE(res, { type: 'done', response: structured });
          return res.end();
        }
        return res.json({ sessionId: finalSessionId, response: structured, text: content });
      }
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

    // ─── Deterministic discovery routing (mating / adoption) ───
    // Named features must work on any model, so route them directly instead of
    // relying on the model to pick the tool. Light regex extracts species/gender.
    const wantsMating = /\bmat(e|ing)\b|breeding|mate my|تزاوج|تزويج|تلقيح/i.test(message);
    const wantsAdoption = /\badopt(ion|able)?\b|rescue a|تبنّ?[يى]|تبني/i.test(message);
    // Vet discovery. When vets are "coming soon", return a helpful gated message
    // instead of letting the request dead-end at the model's "trouble processing".
    const wantsVetRaw = /(find|show|list|need|looking for|recommend|nearby|available).{0,20}(vet|veterinarian|doctor|clinic)|طبيب بيطري|دكتور بيطري|عياد[ةه]/i.test(message);
    const vetsLive = await isFeatureEnabled('vets');
    if (wantsVetRaw && !vetsLive) {
      const content = lang === 'ar'
        ? 'حجز الأطباء البيطريين واكتشافهم سيتوفران قريبًا — نعمل على انضمام أطباء موثوقين. حتى ذلك الحين يسعدني مساعدتك في المجتمع، المفقودات، أو التبنّي! 🐾'
        : "Vet booking & discovery are coming soon — we're onboarding verified vets. In the meantime I'm happy to help with the Community, Lost & Found, or Adoption! 🐾";
      return finishTurn({ blocks: [{ type: 'text', data: { content } }] }, content, { active: false });
    }
    const wantsVet = wantsVetRaw && vetsLive;
    if (wantsMating || wantsAdoption || wantsVet) {
      const species = /\bcat|kitten|قط[ةه]?\b/i.test(message) ? 'cat' : /\bdog|puppy|كلب/i.test(message) ? 'dog' : undefined;
      const blocks = [];
      let summary = '';
      if (wantsMating) {
        const gender = /\bfemale|أنثى/i.test(message) ? 'female' : /\bmale|ذكر/i.test(message) ? 'male' : undefined;
        const r = await tools.findMatingPartners.execute({ species, gender });
        if (r?.success && r.matches?.length) {
          blocks.push({ type: 'mating_match', data: { matches: r.matches, count: r.count } });
          summary = lang === 'ar' ? `لقيت ${r.count} شريك تزاوج متوافق لحيوانك 🐾` : `I found ${r.count} compatible mating match(es) for your pet 🐾`;
        }
      } else if (wantsAdoption) {
        const r = await tools.findAdoptablePets.execute({ species });
        if (r?.success && r.pets?.length) {
          blocks.push({ type: 'adoption', data: { pets: r.pets, count: r.count } });
          summary = lang === 'ar' ? `إليك ${r.count} حيوان لطيف متاح للتبني ❤️` : `Here are ${r.count} lovely pet(s) available for adoption ❤️`;
        }
      } else {
        const locMatch = message.match(/\b(?:in|near|around|at)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)/);
        const r = await tools.findAvailableVets.execute({ limit: 5, location: locMatch ? locMatch[1] : undefined });
        if (r?.success && r.vets?.length) {
          blocks.push({ type: 'vet_list', data: { vets: r.vets, count: r.count } });
          summary = lang === 'ar' ? `لقيت لك ${r.count} طبيب بيطري متاح. تحب أحجزلك موعد؟ 🩺` : `I found ${r.count} available vet(s) for you. Want me to book an appointment? 🩺`;
        }
      }
      if (blocks.length) {
        blocks.push({ type: 'text', data: { content: summary } });
        const turns = [
          ...(session.conversation_history || []),
          { role: 'user', content: message, timestamp: new Date().toISOString() },
          { role: 'assistant', content: summary, timestamp: new Date().toISOString() },
        ];
        const finalSessionId = await persistConversation(session, ctx, turns);
        await logTriage(ctx.userId, message, summary, [{ tool: wantsMating ? 'findMatingPartners' : wantsAdoption ? 'findAdoptablePets' : 'findAvailableVets', args: {} }]);
        const structured = { blocks };
        if (wantsStream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.flushHeaders?.();
          sendSSE(res, { type: 'session', sessionId: finalSessionId });
          sendSSE(res, { type: 'done', response: structured });
          return res.end();
        }
        return res.json({ sessionId: finalSessionId, response: structured, text: summary });
      }
      // No results → fall through to model-driven (it can explain / suggest listing).
    }

    // Model-driven path handles chat / RAG / discovery. It gets only READ-ONLY
    // tools — account/pet/booking writes are handled deterministically by the
    // rail above, so the model can't trip Groq's write-tool validation.
    // Only hand the model vet-listing tools when vets are live — otherwise it could
    // surface real vets or a "Book a Vet" action while the feature is "coming soon".
    const READ_TOOLS = ['searchMedicalGuidelines', 'findMatingPartners', 'findAdoptablePets', 'navigateTo'];
    if (await isFeatureEnabled('vets')) READ_TOOLS.push('findAvailableVets', 'searchProviders');
    const chatTools = Object.fromEntries(Object.entries(tools).filter(([k]) => READ_TOOLS.includes(k)));
    const systemPrompt = getSystemPrompt({ includeRAG: true, includeOnboarding: false });
    if (wantsStream) {
      return await handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools: chatTools, lang });
    }
    return await handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools: chatTools, lang });
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
    const result = await generateAIResponse({ system: systemPrompt, messages, tools, maxSteps: getMaxSteps(), modelName: pickModel({ lang }) });
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
      ? 'لم أفهم ذلك تمامًا. هل يمكنك إخباري بالمزيد؟ يمكنني المساعدة في صحة حيوانك وأعراضه، التبنّي، أو مطابقات التزاوج.'
      : "I didn't quite catch that — could you tell me a bit more? I can help with pet health & symptoms, adoption, or mating matches.";
  }

  const structuredResponse = buildStructuredResponse(responseText, toolResults, lang, userMessage);

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
    const result = await streamAIResponse({ system: systemPrompt, messages, tools, maxSteps: getMaxSteps(), modelName: pickModel({ lang }) });

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

    const structuredResponse = buildStructuredResponse(fullText, toolResults, lang, userMessage);
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
      // The KB is English; inlining a raw chunk as the Arabic reply body reads as
      // mixed-language. Point to the localized medical_info card instead for AR.
      parts.push(ar
        ? 'وجدت معلومات ذات صلة في قاعدة المعرفة البيطرية.'
        : (r.chunks[0].content || 'Here is what I found in our veterinary knowledge base.'));
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
function buildStructuredResponse(text, toolResults, lang = 'en', userMessage = '') {
  const disclaimer = lang === 'ar'
    ? 'هذه معلومات عامة. يُرجى استشارة الطبيب البيطري للحصول على نصيحة خاصة بحيوانك.'
    : 'This is general information. Please consult your veterinarian for advice specific to your pet.';
  const blocks = [];
  let hasMedicalBlock = false;
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
      hasMedicalBlock = true;
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
  // Guarantee a non-diagnostic disclaimer on health answers even when the model
  // replied from general knowledge (no medical_info card was produced).
  const HEALTH_RE = /vaccin|deworm|worm|flea|tick|diet|food|nutrition|toxic|poison|symptom|vomit|diarr|itch|allerg|medic|dose|dosage|spay|neuter|breed|sick|fever|limp|cough|sneez|طعام|تطعيم|تغذية|أعراض|مرض|قيء|إسهال|دواء|جرعة|سام|حكة|حساسية/i;
  if (!hasMedicalBlock && (HEALTH_RE.test(userMessage) || HEALTH_RE.test(text))) {
    blocks.push({ type: 'text', data: { content: `⚠️ ${disclaimer}` } });
  }
  return { blocks };
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default { chat };
