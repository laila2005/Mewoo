/**
 * PetPulse — Server-orchestrated booking flow (hybrid agent)
 *
 * The BACKEND drives the booking sequence deterministically; the LLM is used
 * only to EXTRACT fields (name/email/pet/date) from each user message. This
 * makes the full "book a vet" flow work reliably even on small local models
 * (hermes3) that can't autonomously chain tools — while the model-driven path
 * still handles everything else.
 *
 * Reuses the hardened tools (createAccount/registerPet/findAvailableVets/
 * bookAppointment) so identity is server-owned and every write is authorized.
 */

import { query } from '../config/db.js';
import { getCompatClient } from './llmClient.js';

/** Deterministic booking-intent detector (bilingual). */
export function hasBookingIntent(message = '') {
  return /\b(book|appointment|schedule|make an appointment)\b/i.test(message)
    || /احجز|أحجز|حجز|موعد|ميعاد/.test(message);
}

const MESSAGES = {
  en: {
    askIdentity: "I'd be glad to book a vet appointment! First, what's your name and email so I can set up your account?",
    askPet: "Great — what's your pet's name?",
    askTime: "What date and time would you like? (e.g., \"tomorrow at 10am\")",
    askTimeFuture: "Please pick a date and time in the future for the appointment.",
    noVet: "Sorry, there are no veterinarians available right now. Please try again later.",
    booked: "✅ All set — your appointment is booked! You'll find it under your bookings.",
    conflict: "That time is already taken. What other time works for you?",
    err: "Sorry, something went wrong while booking. Let's try again — what date and time would you like?",
  },
  ar: {
    askIdentity: "يسعدني حجز موعد بيطري! أولاً، ما اسمك وبريدك الإلكتروني حتى أُنشئ حسابك؟",
    askPet: "رائع — ما اسم حيوانك الأليف؟",
    askTime: "ما التاريخ والوقت الذي تفضّله؟ (مثال: \"غدًا الساعة 10 صباحًا\")",
    askTimeFuture: "من فضلك اختر تاريخًا ووقتًا في المستقبل للموعد.",
    noVet: "عذرًا، لا يوجد أطباء بيطريون متاحون حاليًا. حاول لاحقًا.",
    booked: "✅ تم حجز موعدك بنجاح! ستجده ضمن حجوزاتك.",
    conflict: "هذا الوقت محجوز بالفعل. ما الوقت الآخر المناسب لك؟",
    err: "عذرًا، حدث خطأ أثناء الحجز. لنجرّب مجددًا — ما التاريخ والوقت الذي تفضّله؟",
  },
};

/** Use the LLM only to extract structured fields from the message (single JSON call). */
async function extractBookingInfo(message) {
  const ai = getCompatClient();
  if (ai.isMock) return {};
  const today = new Date().toISOString().slice(0, 10);
  const prompt =
    `Extract appointment-booking details from the user's message. Today is ${today}.\n` +
    `Return ONLY a JSON object with these keys (use null when absent):\n` +
    `{"first_name":string|null,"last_name":string|null,"email":string|null,"pet_name":string|null,` +
    `"datetime":string|null,"reason":string|null}\n` +
    `"datetime": the appointment time the user stated, as a LOCAL wall-clock ISO-8601 with NO timezone/offset ` +
    `(e.g., "tomorrow at 7pm" -> the next day's date + "T19:00:00"). Do NOT convert to UTC and do NOT add Z or an offset — ` +
    `just write the exact hour the user said. Resolve relative dates ("tomorrow","next monday","غدًا") against today. ` +
    `Default the time to 10:00 if only a date is given.\n\nUser: "${message}"`;
  try {
    const r = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(r.choices[0].message.content.trim()) || {};
    if (process.env.BOOKING_DEBUG) console.error('[extract]', JSON.stringify(parsed));
    return parsed;
  } catch (e) {
    if (process.env.BOOKING_DEBUG) console.error('[extract ERROR]', e.message);
    return {};
  }
}

const textBlock = (content) => ({ blocks: [{ type: 'text', data: { content } }], text: content });

// Treat a naive local wall-clock ("2026-07-25T19:00:00") as Africa/Cairo (UTC+03:00)
// so "7pm" is stored/displayed as 7pm. LLMs are unreliable at TZ math, so we do it here.
function toCairoISO(dt) {
  if (!dt || typeof dt !== 'string') return dt;
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(dt.trim())) return dt; // already has offset — keep
  const m = dt.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?/);
  return m ? `${m[1]}T${m[2]}:${m[3]}:00+03:00` : dt;
}

/**
 * Advance the booking flow by one turn.
 * @returns {Promise<{text, blocks, flow_state}>}
 */
export async function runBookingFlow({ message, session, ctx, tools, lang = 'en' }) {
  const M = MESSAGES[lang] || MESSAGES.en;
  const state = session.flow_state?.active ? session.flow_state : { active: true, step: 'start', data: {} };
  const d = state.data;

  // Extract whatever the user provided this turn; never overwrite with null.
  const info = await extractBookingInfo(message);
  for (const k of ['first_name', 'last_name', 'email', 'pet_name', 'datetime', 'reason']) {
    if (info[k]) d[k] = info[k];
  }
  if (info.datetime) d.datetime = toCairoISO(info.datetime); // normalize to Cairo local

  const ask = (content, step) => { state.step = step; return { ...textBlock(content), flow_state: state }; };
  const finish = (content, blocks) => { state.active = false; state.step = 'done'; return { text: content, blocks, flow_state: state }; };

  // 1) Identity (guest → create account). ctx.userId is set by createAccount.
  if (!ctx.userId) {
    if (d.email && d.first_name) {
      const res = await tools.createAccount.execute({ email: d.email, first_name: d.first_name, last_name: d.last_name || '' });
      if (!res?.success) return ask(M.askIdentity, 'identity');
      if (!res.already_existed) d.account = { user: res.user, temporary_password: res.temporary_password };
    } else {
      return ask(M.askIdentity, 'identity');
    }
  }

  // 2) Pet (reuse an existing pet, else register the named one).
  if (!d.pet_id) {
    const existing = await query('SELECT id FROM pets WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [ctx.userId]);
    if (existing.rows[0]) d.pet_id = existing.rows[0].id;
    else if (d.pet_name) {
      const res = await tools.registerPet.execute({ name: d.pet_name });
      if (res?.success) d.pet_id = res.pet.id; else return ask(M.askPet, 'pet');
    } else {
      return ask(M.askPet, 'pet');
    }
  }

  // 3) Date/time.
  if (!d.datetime) return ask(M.askTime, 'time');
  const when = new Date(d.datetime);
  if (isNaN(when.getTime()) || when.getTime() < Date.now()) { d.datetime = null; return ask(M.askTimeFuture, 'time'); }

  // 4) Pick a vet (remember its details so we can tell the user who + where).
  if (!d.vet_id) {
    const vets = await tools.findAvailableVets.execute({ limit: 1 });
    if (vets?.success && vets.vets[0]) { d.vet_id = vets.vets[0].vet_user_id; d.vet = vets.vets[0]; }
    else return finish(M.noVet, [{ type: 'text', data: { content: M.noVet } }]);
  }

  // 5) Book.
  const book = await tools.bookAppointment.execute({
    pet_id: d.pet_id, vet_user_id: d.vet_id, appointment_time: d.datetime, reason: d.reason || 'General check-up',
  });
  if (book?.success) {
    const vet = d.vet || {};
    const whenStr = new Date(book.appointment.appointment_time).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US',
      { weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Cairo' });
    const place = vet.clinic_name ? (vet.address ? `${vet.clinic_name} (${vet.address})` : vet.clinic_name) : null;
    const confirmMsg = lang === 'ar'
      ? `✅ تم الحجز مع ${vet.name || 'طبيب بيطري'}${place ? ' في ' + place : ''} يوم ${whenStr}. ستجده ضمن حجوزاتك.`
      : `✅ Booked with ${vet.name || 'a vet'}${place ? ' at ' + place : ''} on ${whenStr}. You'll find it under your bookings.`;
    const blocks = [];
    if (d.account) blocks.push({ type: 'account_created', data: { user: d.account.user, temporary_password: d.account.temporary_password, isGuest: true } });
    blocks.push({ type: 'booking_confirmation', data: { appointment: book.appointment, vet: { name: vet.name || null, clinic_name: vet.clinic_name || null, address: vet.address || null }, message: confirmMsg } });
    blocks.push({ type: 'text', data: { content: confirmMsg } });
    return finish(confirmMsg, blocks);
  }
  // Booking failed (e.g., slot taken) — stay active and ask for another time.
  d.datetime = null; d.vet_id = null; state.step = 'time';
  const msg = /already/i.test(book?.error || '') ? M.conflict : (book?.error || M.err);
  return { ...textBlock(msg), flow_state: state };
}

export default { runBookingFlow, hasBookingIntent };
