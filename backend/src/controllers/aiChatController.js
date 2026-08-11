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
import { detectEmergency, emergencyResponse, detectUrgent, urgentResponse, detectToxicMedication, toxicMedResponse, isArabic, screenAssistantReply } from '../ai/safety.js';
import { runBookingFlow, hasBookingIntent } from '../ai/bookingFlow.js';
import { isFeatureEnabled } from '../config/featureFlags.js';
import { findLostMatches } from '../services/lostFoundMatch.js';
import { speciesMismatch } from '../ai/ragService.js';
import { ROUTES, navBlock } from '../ai/appRoutes.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Pet-health topic sniff — used to attach disclaimers and to force a grounded answer.
const HEALTH_RE = /vaccin|deworm|worm|flea|tick|diet|food|feed|nutrition|toxic|poison|symptom|vomit|diarr|itch|allerg|medic|dose|dosage|spay|neuter|breed|sick|fever|limp|cough|sneez|shed|groom|teeth|dental|parasite|heartworm|weight|obes|anxiet|behavio|pregnan|whelp|قيء|إسهال|تطعيم|ديدان|براغيث|قراد|تغذية|طعام|أعراض|مرض|حكة|حساسية|دواء|جرعة|تعقيم|أسنان|طفيل/i;

/**
 * Last-resort reply text. An assistant turn must NEVER be empty: the client
 * renders whatever it receives, so an empty string became a blank bubble and the
 * bot appeared to give up mid-conversation. That was most visible on a repeated
 * jailbreak ("give it to me" after a refusal), where the user expected the
 * refusal to simply repeat.
 */
const neverEmpty = (text, lang = 'en') => {
  if (text && text.trim()) return text;
  return lang === 'ar'
    ? 'لم أستطع تكوين رد على ذلك. لا أستطيع مشاركة تعليماتي الداخلية، لكن يسعدني مساعدتك في صحة حيوانك، الحجز، التبنّي، أو المفقودات. 🐾'
    : "I couldn't put together a reply to that. I can't share my internal instructions, but I'm glad to help with your pet's health, booking a vet, adoption, or lost & found. 🐾";
};

// A model reply so short/generic it isn't a real answer (empty, a bare disclaimer, or a rephrase-plea).
const isThinReply = (t) => !t || t.trim().length < 45 || /^this is general information|^لم أفهم|^هذه معلومات عامة|could you rephrase|rephrase your question|processed your request|how can i help (you )?further|لقد عالجت طلبك/i.test(t.trim());

// Did any tool actually return renderable content? An empty searchMedicalGuidelines
// call (no chunks) makes toolResults non-empty but produces nothing to show.
const hasRenderableToolResult = (toolResults) => (toolResults || []).some(tr => {
  const r = tr.result;
  return r?.success && (r.chunks?.length || r.vets?.length || r.pets?.length || r.matches?.length || r.providers?.length || r.appointment || r.user || r.route);
});

// Does the message already name a species? (so we only infer from the owner's
// pets when it's actually ambiguous.)
const MENTIONS_SPECIES = /\b(cats?|kittens?|felines?|dogs?|pupp(?:y|ies)|canines?)\b/i;

/**
 * Pet-aware personalization: fetch the logged-in owner's pets so VetAI can tailor
 * answers (species/age/name) and resolve ambiguous "my pet" questions. Returns a
 * compact description + a dominant species (only when unambiguous). Best-effort.
 */
async function getOwnerPetContext(userId) {
  if (!userId) return null;
  try {
    const { rows } = await query(
      `SELECT name, species, breed, age_years FROM pets WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 6`,
      [userId]
    );
    if (!rows.length) return null;
    const desc = rows.map(p => {
      const bits = [p.species || 'pet'];
      if (p.breed) bits.push(p.breed);
      if (p.age_years != null) bits.push(`${p.age_years}y`);
      return `${p.name || 'a pet'} (${bits.join(', ')})`;
    }).join('; ');
    const speciesSet = new Set(rows.map(p => (p.species || '').trim().toLowerCase()).filter(Boolean));
    const species = speciesSet.size === 1 ? [...speciesSet][0] : null; // only if unambiguous
    return { desc, species };
  } catch (e) {
    console.warn('[personalize] pet fetch failed:', e.message);
    return null;
  }
}

// Care-timeline intent: a logged-in owner asking what their pet is due for.
// Kept specific so it never hijacks a general health question ("what do I feed my cat").
const CARE_STATUS_RE = /\b(care (schedule|plan|timeline|reminders?|status)|health (schedule|reminders?|timeline|summary)|(vaccin\w*|vaccine|shots?|deworm\w*|booster|checkups?|check-?ups?)\s*(schedule|reminders?|due|status|history|coming up)|what('?s| is| does| do)\s+(my |our )?(pets?|dogs?|cats?)\s+(due|need|require)|(is|are|when('?s| is| are)?)\b[^.?!]{0,30}\b(vaccin\w*|shots?|deworm\w*|booster|checkups?)\b[^.?!]{0,15}\bdue\b|(overdue|coming up|upcoming|due soon)\b[^.?!]{0,20}\b(vaccin\w*|shots?|deworm\w*|booster|checkups?|care)|remind me\b[^.?!]{0,25}\b(vaccin\w*|shots?|deworm\w*|checkups?|care))\b/i;
const CARE_STATUS_AR = /(جدول|مواعيد|تذكير)[^.؟!]{0,15}(تطعيم|لقاح|رعاية|فحص)|(تطعيم|لقاح)[^.؟!]{0,10}(مستحق|متأخر|قادم|القادم)|ماذا يحتاج[^.؟!]{0,12}(حيوان|كلب|قط)|متى[^.؟!]{0,15}(تطعيم|اللقاح|الفحص|التطعيمات)/;

function detectCareStatus(message = '') {
  return CARE_STATUS_RE.test(message) || CARE_STATUS_AR.test(message);
}

/**
 * Deterministic per-pet care timeline for a logged-in owner. Reads real pet +
 * vaccination rows, buckets each due date into overdue / due-soon / upcoming.
 * No model, no key, not feature-gated — pure data. Returns { blocks, text } or null.
 */
async function buildCareTimeline(userId, lang = 'en', { canBook = false } = {}) {
  if (!userId) return null;
  let rows;
  try {
    const r = await query(
      `SELECT p.id AS pet_id, p.name AS pet_name, p.species,
              v.vaccine_name, v.due_at, v.given_at, v.status
         FROM pets p
         LEFT JOIN vaccinations v ON v.pet_id = p.id
        WHERE p.owner_id = $1
        ORDER BY p.created_at ASC, v.due_at ASC NULLS LAST`,
      [userId]
    );
    rows = r.rows;
  } catch (e) {
    console.warn('[care-timeline] query failed:', e.message);
    return null;
  }
  const ar = lang === 'ar';

  if (!rows || rows.length === 0) {
    const content = ar
      ? 'لا أرى أي حيوانات أليفة في حسابك بعد. أضِف حيوانك من صفحة "حيواناتي" وسأتابع معك مواعيد التطعيمات والرعاية. 🐾'
      : "I don't see any pets on your account yet. Add your pet from the “My Pets” page and I'll keep track of vaccinations and care reminders for you. 🐾";
    return { blocks: [{ type: 'text', data: { content } }, navBlock(ROUTES.ADD_PET, ar ? 'أضف حيوانًا' : 'Add a pet')], text: content };
  }

  // Group rows by pet.
  const pets = new Map();
  for (const row of rows) {
    if (!pets.has(row.pet_id)) pets.set(row.pet_id, { name: row.pet_name || (ar ? 'حيوانك' : 'your pet'), species: (row.species || '').toLowerCase(), vaccines: [] });
    if (row.vaccine_name || row.due_at) pets.get(row.pet_id).vaccines.push(row);
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const DAY = 86400000;
  const fmt = (d) => { try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); } };
  const isDone = (s) => /done|complete|given|administered|تم|مكتمل/i.test(String(s || ''));

  let anyOverdue = false;
  const petLines = [];
  for (const pet of pets.values()) {
    const overdue = [], dueSoon = [], upcoming = [];
    for (const v of pet.vaccines) {
      if (!v.due_at) continue;
      const due = new Date(v.due_at); due.setHours(0, 0, 0, 0);
      const days = Math.round((due - today) / DAY);
      const label = v.vaccine_name || (ar ? 'تطعيم' : 'vaccination');
      if (days < 0) { if (!isDone(v.status)) overdue.push({ label, when: fmt(v.due_at), days }); }
      else if (days <= 30) dueSoon.push({ label, when: fmt(v.due_at), days });
      else if (days <= 120) upcoming.push({ label, when: fmt(v.due_at), days });
    }
    if (overdue.length) anyOverdue = true;

    const head = `🐾 ${ar ? '' : ''}**${pet.name}**${pet.species ? ` (${pet.species})` : ''}`;
    const parts = [head];
    if (overdue.length) parts.push(...overdue.map(o => ar
      ? `   ⚠️ متأخر: ${o.label} (كان مستحقًا ${o.when})`
      : `   ⚠️ Overdue: ${o.label} (was due ${o.when})`));
    if (dueSoon.length) parts.push(...dueSoon.map(o => ar
      ? `   🔔 قريبًا: ${o.label} (${o.when})`
      : `   🔔 Due soon: ${o.label} (${o.when})`));
    if (upcoming.length) parts.push(...upcoming.map(o => ar
      ? `   🗓 قادم: ${o.label} (${o.when})`
      : `   🗓 Upcoming: ${o.label} (${o.when})`));
    if (!overdue.length && !dueSoon.length && !upcoming.length) parts.push(ar
      ? '   ✅ لا توجد تطعيمات مسجّلة قادمة. تأكّد أن سجلّ التطعيمات محدّث.'
      : "   ✅ No upcoming vaccinations on record. Make sure their vaccination log is up to date.");
    petLines.push(parts.join('\n'));
  }

  const intro = ar ? '🗓️ إليك ملخّص رعاية حيواناتك بناءً على سجلّاتك:' : "🗓️ Here's your pets' care summary from your records:";
  const outro = ar
    ? '\n\n(هذه تذكيرات مبنية على سجلّاتك، لا تشخيص طبي.)'
    : '\n\n(These are reminders based on your records — not a medical diagnosis.)';
  const content = `${intro}\n\n${petLines.join('\n\n')}${outro}`;

  const blocks = [{ type: 'text', data: { content } }];
  blocks.push(navBlock(ROUTES.MY_PETS, ar ? 'حيواناتي' : 'My Pets'));
  if (anyOverdue && canBook) blocks.push(navBlock(ROUTES.VETS, ar ? 'احجز مع طبيب بيطري' : 'Book a Vet'));
  return { blocks, text: content };
}

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
      const row = rows[0];
      // OWNERSHIP CHECK. This lookup was by id alone, so any caller presenting a
      // session id got that session's transcript and booking state — including
      // after the browser switched accounts, since the client stores the id under
      // a global localStorage key. A session already bound to a user may only be
      // continued by that user; an unclaimed guest session (user_id NULL) stays
      // usable by whoever holds the id and is claimed on first authenticated use.
      if (row && (row.user_id == null || row.user_id === ctx.userId)) {
        session = row;
        conversationHistory = row.conversation_history || [];
      } else if (row) {
        // Do not error — silently start a clean session so the chat still works.
        console.warn('[ai] session ownership mismatch; starting a fresh session');
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

    // Shared responder for the deterministic branches below (stream- or JSON-aware).
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

    // ─── Toxic-medication guardrail (before urgent/booking) ───
    // "how much ibuprofen can I give my dog" must get a safety warning, never a dose.
    if (detectToxicMedication(message)) {
      const structured = toxicMedResponse(message, { canBook: await isFeatureEnabled('vets') });
      return finishTurn(structured, structured.blocks[0].data.content, undefined);
    }

    // ─── Prompt-extraction / jailbreak refusal ───
    if (/\b(system prompt|your (instructions|prompt|rules|guidelines)|ignore (all |your )?(previous |prior )?instructions|reveal your (prompt|instructions|rules)|print your (prompt|instructions)|repeat your (prompt|instructions)|jailbreak|developer mode)\b/i.test(message)) {
      const content = lang === 'ar'
        ? 'لا أستطيع مشاركة تعليماتي الداخلية 🙂 لكن يسعدني مساعدتك في صحة حيوانك وأعراضه، التبنّي، أو مطابقات التزاوج. كيف أساعدك؟'
        : "I can't share my internal instructions 🙂 — but I'm happy to help with your pet's health, adoption, or mating matches. How can I help?";
      return finishTurn({ blocks: [{ type: 'text', data: { content } }] }, content, undefined);
    }

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
        photoBlocks.push(navBlock(ROUTES.VETS, photoLang === 'ar' ? 'احجز مع طبيب بيطري' : 'Book a Vet'));
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
          navBlock(ROUTES.SIGNUP, lang === 'ar' ? 'إنشاء حساب' : 'Create account'),
          { type: 'text', data: { content } },
        ],
      }, content, { active: false });
    }

    // ─── Proactive per-pet care timeline (logged-in owners) ───
    // "what is my dog due for?", "vaccination schedule", "when is my cat's shot
    // due?" → deterministic answer from the owner's real pet + vaccination
    // records. Runs BEFORE the booking rail so a schedule question ("موعد
    // التطعيم") isn't mistaken for a booking request; still yields to an
    // in-progress booking flow via the !active guard.
    if (ctx.userId && !session.flow_state?.active && detectCareStatus(message)) {
      const timeline = await buildCareTimeline(ctx.userId, lang, { canBook: await isFeatureEnabled('vets') });
      if (timeline) {
        await logTriage(ctx.userId, message, timeline.text, [{ tool: 'careTimeline', args: {} }]);
        return finishTurn({ blocks: timeline.blocks }, timeline.text, undefined);
      }
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

    // ─── Social / capability intents (deterministic — never dead-end) ───
    const mRaw = message.trim();
    const isGreeting = /^\s*(hi|hey|hello|hiya|yo|howdy|good (morning|evening|afternoon)|salam|salaam|مرحبا|أهلا|اهلا|السلام|هاي)\b[\s!.،؟?]*$/i.test(mRaw);
    const isThanks = /\b(thank you|thanks|thx|thank u|much appreciated|شكرا|شكرًا|متشكر|تسلم)\b/i.test(mRaw);
    // Capability questions. Written to tolerate word order and padding, because a
    // near-miss here falls through to the model, which then picks a random tool —
    // "what you can do" (not "what CAN YOU do") was answered with a list of vets.
    const isWhoAmI =
      /\b(who|what)\s+(are|r)\s+(you|u)\b/i.test(mRaw) ||
      // what you can do / what can you do / tell me what you can do / what you do
      /\bwhat\s+(?:can\s+you|you\s+can|do\s+you|you)\s+(?:do|help|offer|handle)\b/i.test(mRaw) ||
      /\b(how|what)\s+(?:can|do)\s+you\s+help\b/i.test(mRaw) ||
      /\b(your\s+(?:name|capabilities|features)|what\s+is\s+petpulse|help\s+me\s+with\s+what)\b/i.test(mRaw) ||
      /\b(what|which)\s+(?:services|features|things)\b.{0,20}\b(you|offer|available)\b/i.test(mRaw) ||
      /من أنت|مين انت|ماذا تفعل|كيف تساعد|ماذا يمكنك|ايه اللي تقدر|إيه اللي تقدر|ما هو بيت ?بالس|بتعمل ايه|بتعمل إيه/.test(mRaw);
    if (isThanks && mRaw.length < 40) {
      const content = lang === 'ar' ? 'العفو! 🐾 أنا هنا وقتما تحتاج — صحة حيوانك، التبنّي، أو أي سؤال آخر.' : "You're welcome! 🐾 I'm here whenever you need — pet health, adoption, or anything else.";
      return finishTurn({ blocks: [{ type: 'text', data: { content } }] }, content, undefined);
    }
    if (isGreeting || isWhoAmI) {
      const content = lang === 'ar'
        ? 'أهلًا! 🐾 أنا VetAI، مساعدك في PetPulse. أقدر أساعدك في: أسئلة صحة حيوانك وأعراضه، إيجاد حيوانات للتبنّي، مطابقات التزاوج، المفقودات، واستضافة الحيوانات. بمَ أساعدك؟'
        : "Hi! 🐾 I'm VetAI, your PetPulse assistant. I can help with your pet's health & symptoms, finding pets to adopt, mating matches, lost & found, and pet hosting. What can I help you with?";
      return finishTurn({ blocks: [{ type: 'text', data: { content } }] }, content, undefined);
    }

    // ─── Live-feature routing (lost / found / rehome / hosting) ───
    const goFeature = (route, en, ar, enLabel, arLabel) => finishTurn(
      { blocks: [{ type: 'navigation', data: { route, label: lang === 'ar' ? arLabel : enLabel } }, { type: 'text', data: { content: lang === 'ar' ? ar : en } }] },
      lang === 'ar' ? ar : en, undefined,
    );
    const isLost = (/\b(lost|missing|can'?t find|ran away|run away|escaped|went missing)\b/i.test(mRaw) && /\b(dog|cat|pet|puppy|kitten|him|her|it)\b/i.test(mRaw))
      || /\bmy (dog|cat|pet|puppy|kitten) (is )?(lost|missing|gone)\b/i.test(mRaw)
      || /فقدت|ضاع|ضاعت|مفقود|هرب|هربت|تاه|تاهت/.test(mRaw);
    const isFound = /\b(i )?found\b[^.?!]{0,20}\b(stray|dog|cat|pet|puppy|kitten|animal)\b/i.test(mRaw) || /لقيت|وجدت (قط|كلب|حيوان)|عثرت على (قط|كلب|حيوان)/.test(mRaw);
    const isRehome = /\b(rehome|re-home|give (up|away)|put (him|her|it|my \w+) up for adoption|find (a )?(new )?home for|surrender|adopt out)\b/i.test(mRaw) || /أتخلى|أعطي.{0,15}للتبني|إعادة تسكين|بيت جديد|أتبرع ب/.test(mRaw);
    const isHosting = /\bpet ?(sitter|sitting|boarding|hosting)\b/i.test(mRaw)
      || /\b(board|watch|take care of|look after|mind|care for)\b[^.?!]{0,15}\b(my |the )?(dog|cat|pet|puppy|kitten)\b/i.test(mRaw)
      || /\b(someone|somebody) to (watch|keep|mind|care for|look after|board|host)\b/i.test(mRaw)
      || /while (i|we) (travel|am away|are away|am traveling|are traveling|go away)/i.test(mRaw)
      || /استضافة|من يعتني ب|يرعى حيوان|أثناء سفري|وأنا مسافر/.test(mRaw);
    if (isFound || isLost) {
      // Extract what we can from free text so the agent can actually work the case.
      const species = /\bcat|kitten|قط/i.test(mRaw) ? 'Cat' : /\bdog|puppy|كلب/i.test(mRaw) ? 'Dog' : undefined;
      const locMatch = mRaw.match(/\b(?:near|in|around|at|by)\s+([A-Za-z][A-Za-z\s]{2,40})/i)
        || mRaw.match(/(?:في|قرب|بجانب|عند)\s+([؀-ۿ][؀-ۿ\s]{2,40})/);
      const area = locMatch ? locMatch[1].trim().replace(/\s+(and|with|near|the)$/i, '').trim() : undefined;

      if (isFound) {
        // "I found a stray cat near Maadi" → the agent scans every open report and
        // connects the finder to owners who are searching. Read-only, so it's safe.
        const matches = await findLostMatches({ species, area, description: mRaw }, { limit: 5 });
        if (matches.length) {
          const lines = matches.map(m => {
            const pct = `${m.match_score}%`;
            const where = m.last_seen_location ? ` — last seen ${m.last_seen_location}` : '';
            return lang === 'ar'
              ? `• ${m.pet_name || 'حيوان'} (${m.species || ''})${where} — تطابق ${pct}`
              : `• ${m.pet_name || 'A pet'} (${m.species || 'pet'})${where} — ${pct} match`;
          }).join('\n');
          const content = lang === 'ar'
            ? `بحثت في كل بلاغات الفقدان المفتوحة ووجدت ${matches.length} قد تطابق ما رأيته:\n\n${lines}\n\nافتح لوحة المفقودات لرؤية الصور ومراسلة صاحبها — قد تجمع شملهما اليوم! 🐾`
            : `I checked every open report and found ${matches.length} that might match what you saw:\n\n${lines}\n\nOpen Lost & Found to see photos and message the owner — you could reunite them today! 🐾`;
          return finishTurn({
            blocks: [
              navBlock(ROUTES.LOST_FOUND, lang === 'ar' ? 'افتح المفقودات' : 'Open Lost & Found'),
              { type: 'text', data: { content } },
            ],
          }, content, undefined);
        }
        // Nothing on the board yet — posting the sighting helps the owner find them.
        return goFeature('/community#lostfound',
          "I checked the board and didn't find a matching open report yet. Posting what you found there is the fastest way for the owner to reach you. 🐾",
          'بحثت في اللوحة ولم أجد بلاغًا مطابقًا بعد. نشر ما وجدته هناك أسرع طريقة ليصل إليك صاحبه. 🐾',
          'Open Lost & Found', 'افتح المفقودات');
      }

      // isLost → explain what the agent will do the moment they post, then route.
      const areaBit = area ? (lang === 'ar' ? ` حول ${area}` : ` around ${area}`) : '';
      const content = lang === 'ar'
        ? `يؤسفني ذلك — لنتحرك بسرعة. انشر بلاغًا على لوحة المفقودات، وفور نشره ينبّه PetPulse أصحاب الحيوانات القريبين${areaBit} ويعلمك فورًا عندما يبلّغ أحدهم عن مشاهدة. اضغط بالأسفل لبدء البلاغ. 🐾`
        : `I'm sorry — let's move fast. Post a report on the Lost & Found board: the moment you do, PetPulse alerts nearby owners${areaBit} and pings you the second someone reports a sighting. Tap below to start the report. 🐾`;
      return finishTurn({
        blocks: [
          navBlock(ROUTES.LOST_FOUND, lang === 'ar' ? 'أبلغ عن فقدان' : 'Report a lost pet'),
          { type: 'text', data: { content } },
        ],
      }, content, undefined);
    }
    if (isRehome) {
      return goFeature('/community#adoptions',
        'You can list your pet for adoption in our Community so a loving family can find them. ❤️',
        'يمكنك عرض حيوانك للتبنّي في المجتمع ليجد عائلة محبّة. ❤️',
        'List for adoption', 'عرض للتبنّي');
    }
    if (isHosting) {
      return goFeature('/community#hosting',
        'Looking for someone to care for your pet? Our Pet Hosting connects you with trusted hosts. 🏠',
        'تبحث عن من يعتني بحيوانك؟ خدمة الاستضافة تربطك بمضيفين موثوقين. 🏠',
        'Find a host', 'إيجاد مضيف');
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
    let systemPrompt = getSystemPrompt({ includeRAG: true, includeOnboarding: false });

    // Pet-aware personalization: give the model the owner's pets so it tailors
    // advice, and infer species for ambiguous "my pet" questions.
    const petCtx = await getOwnerPetContext(ctx.userId);
    let ownerSpecies = null;
    if (petCtx) {
      systemPrompt += `\n\nThe user's pets: ${petCtx.desc}. When the question is about their pet, tailor the advice to the relevant pet's species and age and you may refer to it by name. If they say "my pet" without naming a species and they have only one species, assume that species.`;
      if (petCtx.species && !MENTIONS_SPECIES.test(message)) ownerSpecies = petCtx.species;
    }

    if (wantsStream) {
      return await handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools: chatTools, lang, ownerSpecies });
    }
    return await handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage: message, ctx, tools: chatTools, lang, ownerSpecies });
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
async function handleJsonResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools, lang = 'en', ownerSpecies = null }) {
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
  if (!hasRenderableToolResult(toolResults) && (!responseText || (HEALTH_RE.test(userMessage) && isThinReply(responseText)))) {
    // Model produced nothing renderable (or a thin non-answer for a health Q) — try a grounded KB answer.
    const rag = await ragFallbackAnswer(tools, userMessage, lang, ownerSpecies);
    if (rag) {
      const ragSessionId = await persistConversation(session, ctx, [
        ...(session.conversation_history || []),
        { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
        { role: 'assistant', content: rag.text, timestamp: new Date().toISOString() },
      ]);
      await logTriage(ctx.userId, userMessage, rag.text, [{ tool: 'ragFallback', args: {} }]);
      return res.json({ sessionId: ragSessionId, response: { blocks: rag.blocks }, text: rag.text });
    }
    if (!responseText) responseText = lang === 'ar'
      ? 'لم أفهم ذلك تمامًا. هل يمكنك إخباري بالمزيد؟ يمكنني المساعدة في صحة حيوانك وأعراضه، التبنّي، أو مطابقات التزاوج.'
      : "I didn't quite catch that — could you tell me a bit more? I can help with pet health & symptoms, adoption, or mating matches.";
  }

  // Unconditional non-empty guard. The RAG fallback above only runs when there
  // is no renderable tool result, so a tool-only turn that produced no model text
  // fell through with responseText === '' and rendered as a blank bubble.
  responseText = neverEmpty(responseText, lang);

  let structuredResponse = buildStructuredResponse(responseText, toolResults, lang, userMessage);

  // Output guardrail (defense-in-depth): screen the model's own reply and
  // replace it if it volunteered a dose / dangerous remedy / prompt leak.
  const outGuard = screenAssistantReply(responseText, { lang });
  if (outGuard) {
    responseText = neverEmpty(outGuard.text, lang);
    structuredResponse = { blocks: outGuard.blocks };
    console.warn(`[safety] output guardrail replaced reply (${outGuard.blocked})`);
  }

  const turns = [
    ...(session.conversation_history || []),
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: responseText, toolResults, timestamp: new Date().toISOString() },
  ];
  const finalSessionId = await persistConversation(session, ctx, turns);
  await logTriage(ctx.userId, userMessage, responseText, outGuard ? [{ tool: 'outputGuardrail', args: { kind: outGuard.blocked } }] : toolResults);

  res.json({ sessionId: finalSessionId, response: structuredResponse, text: responseText });
}

/**
 * SSE streaming response.
 */
async function handleStreamingResponse(req, res, { systemPrompt, messages, session, userMessage, ctx, tools, lang = 'en', ownerSpecies = null }) {
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
    if (!hasRenderableToolResult(toolResults) && (!fullText || (HEALTH_RE.test(userMessage) && isThinReply(fullText)))) {
      // Model streamed nothing renderable (or a thin non-answer for a health Q) — try a grounded KB answer.
      const rag = await ragFallbackAnswer(tools, userMessage, lang, ownerSpecies);
      if (rag) {
        sendSSE(res, { type: 'done', response: { blocks: rag.blocks } });
        const ragTurns = [
          ...(session.conversation_history || []),
          { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
          { role: 'assistant', content: rag.text, timestamp: new Date().toISOString() },
        ];
        await persistConversation(session, ctx, ragTurns);
        await logTriage(ctx.userId, userMessage, rag.text, [{ tool: 'ragFallback', args: {} }]);
        return res.end();
      }
      if (!fullText) fullText = lang === 'ar'
        ? 'لم أفهم ذلك تمامًا. هل يمكنك إخباري بالمزيد؟ يمكنني المساعدة في صحة حيوانك وأعراضه، التبنّي، أو مطابقات التزاوج.'
        : "I didn't quite catch that — could you tell me a bit more? I can help with pet health & symptoms, adoption, or mating matches.";
    }

    // Unconditional non-empty guard. On the streaming path an empty fullText means
    // NO tokens were ever streamed, so the client is left holding an empty bubble.
    // Emit `replace` as well as fixing the text, since there is nothing on screen
    // for the `done` payload to correct.
    if (!fullText || !fullText.trim()) {
      fullText = neverEmpty(fullText, lang);
      sendSSE(res, { type: 'replace', content: fullText });
    }

    let structuredResponse = buildStructuredResponse(fullText, toolResults, lang, userMessage);

    // Output guardrail (defense-in-depth): the `done` event is authoritative for
    // the final rendered/persisted reply — replace it if the model volunteered a
    // dose / dangerous remedy / prompt leak, and tell the client to override.
    const outGuard = screenAssistantReply(fullText, { lang });
    if (outGuard) {
      fullText = neverEmpty(outGuard.text, lang);
      structuredResponse = { blocks: outGuard.blocks };
      console.warn(`[safety] output guardrail replaced streamed reply (${outGuard.blocked})`);
      sendSSE(res, { type: 'replace', content: fullText });
    }
    sendSSE(res, { type: 'done', response: structuredResponse });

    const turns = [
      ...(session.conversation_history || []),
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullText, toolResults, timestamp: new Date().toISOString() },
    ];
    await persistConversation(session, ctx, turns);
    await logTriage(ctx.userId, userMessage, fullText, outGuard ? [{ tool: 'outputGuardrail', args: { kind: outGuard.blocked } }] : toolResults);
  } catch (streamErr) {
    // The model provider failed (Groq free-tier rate limit, quota, timeout,
    // outage). Previously this emitted a bare `error` event and stopped, and
    // since no tokens had streamed the user was left staring at a BLANK BUBBLE
    // with no explanation — the single worst failure mode in the chat.
    //
    // The JSON path already degrades well here: it falls through to a grounded
    // knowledge-base answer. Verified against production during a live Groq rate
    // limit — same question, same moment: JSON returned a 556-character cited
    // answer while SSE returned nothing. So run the SAME fallback chain instead
    // of giving up, and only apologise if even that yields nothing.
    console.error('Streaming error (recovering):', streamErr?.message || streamErr);

    let recovered = null;
    try {
      recovered = await ragFallbackAnswer(tools, userMessage, lang, ownerSpecies);
    } catch (ragErr) {
      console.warn('Streaming fallback RAG also failed:', ragErr?.message);
    }

    if (recovered) {
      // Nothing was streamed, so `replace` is what actually paints the bubble.
      sendSSE(res, { type: 'replace', content: recovered.text });
      sendSSE(res, { type: 'done', response: { blocks: recovered.blocks } });
      try {
        await persistConversation(session, ctx, [
          ...(session.conversation_history || []),
          { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
          { role: 'assistant', content: recovered.text, timestamp: new Date().toISOString() },
        ]);
        await logTriage(ctx.userId, userMessage, recovered.text, [{ tool: 'streamFallbackRag', args: {} }]);
      } catch { /* persistence is best-effort on a degraded turn */ }
    } else {
      const content = lang === 'ar'
        ? 'أعتذر — لم أتمكن من الوصول إلى مساعدي الذكي في هذه اللحظة. جرّب مرة أخرى بعد قليل، أو اسألني عن صحة حيوانك وسأجيب من قاعدة المعرفة البيطرية. 🐾'
        : "Sorry — I couldn't reach my AI service just now. Please try again in a moment, or ask me a pet-health question and I'll answer from the veterinary knowledge base. 🐾";
      sendSSE(res, { type: 'replace', content });
      sendSSE(res, { type: 'done', response: { blocks: [{ type: 'text', data: { content } }] } });
    }
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

/** Last-resort grounded answer: pull from the veterinary KB when the model produced no prose. */
async function ragFallbackAnswer(tools, userMessage, lang, ownerSpecies = null) {
  const isHealth = HEALTH_RE.test(userMessage);
  const disclaimer = lang === 'ar'
    ? 'هذه معلومات عامة. يُرجى استشارة الطبيب البيطري للحصول على نصيحة خاصة بحيوانك.'
    : 'This is general information. Please consult your veterinarian for advice specific to your pet.';
  // Personalization: for an ambiguous "my pet" question, bias retrieval to the
  // owner's species so a cat owner asking "what should I feed my pet?" gets the
  // cat answer (and the species guard resolves correctly).
  const q = (ownerSpecies && !MENTIONS_SPECIES.test(userMessage)) ? `${userMessage} ${ownerSpecies}` : userMessage;
  try {
    const r = await tools.searchMedicalGuidelines.execute({ query: q });
    if (r?.success && r.chunks?.length) {
      // Relevance gate — only surface a chunk that actually shares meaningful words
      // with the question, so we NEVER answer "what to feed?" with "feline diabetes".
      let useTop = [];
      if (lang === 'ar') {
        useTop = r.chunks.slice(0, 3); // KB is English; can't keyword-match cross-language
      } else {
        // Stopwords + GENERIC health words that appear in many unrelated chunks
        // ("diet"/"food"/"care" show up in a diabetes chunk too) — a match must be
        // on a DISTINCTIVE word ("senior", "fleas", "deworm", "kennel") to count.
        // NOTE: feed/food/diet are intentionally NOT stopped — they are the topic of
        // feeding questions. Species filtering + match-count ranking keep an off-topic
        // chunk (e.g. feline diabetes) from outranking a genuine feeding chunk.
        const stop = new Set([
          'what', 'when', 'where', 'which', 'should', 'could', 'would', 'about', 'there', 'their', 'have', 'does', 'dont', 'the', 'and', 'for', 'you', 'your', 'with', 'how', 'can', 'give', 'from', 'this', 'that', 'need', 'want',
          'good', 'best', 'care', 'health', 'healthy', 'tips', 'advice', 'help', 'pet', 'pets', 'animal', 'recommend', 'suggest', 'info', 'information', 'take', 'keep', 'make',
        ]);
        // Keep the short species words cat/dog — they disambiguate cat vs dog answers.
        const qWords = q.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
          .filter(w => (w.length > 3 && !stop.has(w)) || w === 'cat' || w === 'dog');
        // Species guard: a single-species question must never be answered from the
        // other species' chunk (count-based, so a passing "dog food" mention in a
        // cat entry doesn't defeat it). Shared with ragService so the two never drift.
        const scored = r.chunks
          .filter(c => !speciesMismatch(q, c.content || ''))
          .map(c => ({ c, hits: qWords.filter(w => (c.content || '').toLowerCase().includes(w)).length }))
          .sort((a, b) => b.hits - a.hits);
        // Adaptive: multi-keyword queries need 2 matches; a single-keyword query ("fleas") needs 1.
        const minHits = qWords.length >= 2 ? 2 : 1;
        useTop = qWords.length ? scored.filter(s => s.hits >= minHits).slice(0, 3).map(s => s.c) : [];
      }
      if (useTop.length) {
        const text = lang === 'ar'
          ? `إليك ما وجدته في قاعدة المعرفة البيطرية لدينا 👇\n\n${disclaimer}`
          : `According to our veterinary knowledge base:\n\n${useTop[0].content}\n\n${disclaimer}`;
        return { text, blocks: [{ type: 'medical_info', data: { chunks: useTop, disclaimer } }, { type: 'text', data: { content: text } }] };
      }
    }
  } catch { /* ignore — fall through */ }
  // No relevant KB content. For a health question, be honest (never surface a wrong
  // chunk); for anything else, let the caller use its generic reply.
  if (isHealth) {
    // Self-improving KB loop: log the unanswered health question so admins can see
    // what content to author next. Best-effort — never blocks the reply.
    logKbGap(userMessage, lang);
    const text = lang === 'ar'
      ? 'سؤال مهم عن صحة حيوانك 🐾 لا تتوفر لديّ إرشادات دقيقة حول هذا الموضوع في قاعدتي حاليًا؛ أنصح باستشارة طبيب بيطري للحصول على نصيحة موثوقة. هل أساعدك في شيء آخر؟'
      : "That's an important question about your pet's health 🐾 I don't have specific guidance on that in my knowledge base yet — for reliable advice I'd recommend asking a vet. Is there anything else I can help with?";
    return { text, blocks: [{ type: 'text', data: { content: text } }] };
  }
  return null;
}

/** Record a health question the KB couldn't answer (fire-and-forget). */
function logKbGap(question, lang) {
  query(
    'INSERT INTO ai_kb_gaps (question, lang) VALUES ($1, $2)',
    [String(question).slice(0, 500), lang || null]
  ).catch(e => console.warn('[kb-gap] log failed:', e.message));
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
  if (!hasMedicalBlock && (HEALTH_RE.test(userMessage) || HEALTH_RE.test(text))) {
    blocks.push({ type: 'text', data: { content: `⚠️ ${disclaimer}` } });
  }
  return { blocks };
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default { chat };
