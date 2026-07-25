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
    askVet: 'Here are the available vets. Which one would you like to book with?',
    askVetNear: (loc) => `Here are vets near ${loc}, closest first. Which one would you like to book with?`,
    vetNotMatched: "I didn't catch which vet — tap one of the options above, or tell me the vet's name.",
    askArea: "Which area are you in? (e.g., Maadi, Zamalek, New Cairo) — I'll show the closest vets. Or say \"any\" to see all.",
    closedDay: (name, days) => `${name} isn't available on that day. Working days are ${days.join(', ')}. What other day works?`,
    outsideHours: (name, s, e) => `${name} works from ${s} to ${e}. Please pick a time within those hours.`,
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
    askVet: 'هؤلاء الأطباء المتاحون. مع أي طبيب تودّ الحجز؟',
    askVetNear: (loc) => `هؤلاء أطباء قريبون من ${loc} (الأقرب أولاً). مع أي طبيب تودّ الحجز؟`,
    vetNotMatched: 'لم أتعرّف على الطبيب — اختر أحد الخيارات بالأعلى أو اكتب اسم الطبيب.',
    askArea: 'في أي منطقة أنت؟ (مثل: المعادي، الزمالك، التجمع) — سأعرض أقرب الأطباء. أو اكتب "أي" لعرض الكل.',
    closedDay: (name, days) => `${name} غير متاح في ذلك اليوم. أيام العمل: ${days.join('، ')}. ما اليوم الآخر المناسب؟`,
    outsideHours: (name, s, e) => `${name} يعمل من ${s} إلى ${e}. من فضلك اختر وقتًا ضمن هذه المواعيد.`,
  },
};

/** True if the user's reply means "no preference / show all" (area fallback skip). */
function isSkipArea(message = '') {
  return /^(any|anywhere|whatever|no|none|skip|doesn'?t matter|all|everywhere)\b/i.test(message.trim())
    || /^(أي|أي مكان|لا يهم|الكل|أيّ|اي)\b/.test(message.trim());
}

/**
 * Resolve which candidate vet the user picked.
 * @param {object} opts.allowOrdinal - match bare numbers/ordinals ("2", "second").
 *   Off during the time turn, whose message ("at 3pm") would otherwise look like a pick.
 */
function resolveVetChoice(message = '', candidates = [], opts = {}) {
  const { allowOrdinal = true } = opts;
  if (!candidates.length) return null;
  const m = message.trim().toLowerCase();
  // Name / clinic substring match (safe on any turn) — "book with dr. amina", "maadi pet wellness".
  const byName = candidates.find(c => {
    const nm = (c.name || '').toLowerCase().replace(/^dr\.?\s*/i, '');
    const surname = nm.split(/\s+/).filter(Boolean).pop() || '';
    return (nm && m.includes(nm)) || (surname.length > 2 && m.includes(surname))
      || (c.clinic_name && m.includes(c.clinic_name.toLowerCase()));
  });
  if (byName) return byName;
  if (!allowOrdinal) return null;
  // "closest / nearest / first / any / you choose / اقرب / الأقرب / أي / الأول"
  if (/\b(closest|nearest|first|any|you choose|whichever|any one)\b/.test(m)
      || /أقرب|اقرب|الأقرب|الاقرب|الأول|الاول|أي\s|اي\s|اختر أنت/.test(m)) {
    return candidates[0];
  }
  // Ordinal number: "1", "2", "vet 2", "option 3", "الثاني"...
  const numMap = { first: 1, second: 2, third: 3, fourth: 4, 'الأول': 1, 'الاول': 1, 'الثاني': 2, 'الثالث': 3, 'الرابع': 4 };
  for (const [w, n] of Object.entries(numMap)) if (m.includes(w) && candidates[n - 1]) return candidates[n - 1];
  const digit = m.match(/\b([1-9])\b/);
  if (digit && candidates[Number(digit[1]) - 1]) return candidates[Number(digit[1]) - 1];
  return null;
}

/**
 * Deterministic pre-parse — email and "I'm/my name is X" are trivial with a regex
 * and MORE reliable than any model, so we never depend on the LLM for identity.
 */
function deterministicExtract(message = '') {
  const out = {};
  const email = message.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  if (email) out.email = email[0];
  // "my name is X", "I'm X", "I am X", "this is X", "am X" — capture 1–3 name words.
  const nameRe = /(?:my name is|i['’ ]?a?m|this is|i am|call me)\s+([A-Za-z][A-Za-z'’-]+(?:\s+[A-Za-z][A-Za-z'’-]+){0,2})/i;
  const nm = message.match(nameRe);
  if (nm) {
    // Stop at connector words that aren't part of a name.
    const words = nm[1].split(/\s+/).filter(w => !/^(and|email|e-mail|my|the|is)$/i.test(w));
    if (words.length) { out.first_name = words[0]; if (words.length > 1) out.last_name = words.slice(1).join(' '); }
  }
  return out;
}

/** Use the LLM only to extract structured fields from the message (single JSON call). */
async function extractBookingInfo(message) {
  const det = deterministicExtract(message);
  const ai = getCompatClient();
  if (ai.isMock) return det;
  const today = new Date().toISOString().slice(0, 10);
  const prompt =
    `Extract appointment-booking details from the user's message. Today is ${today}.\n` +
    `Return ONLY a JSON object with these keys (use null when absent):\n` +
    `{"first_name":string|null,"last_name":string|null,"email":string|null,"pet_name":string|null,` +
    `"datetime":string|null,"reason":string|null,"location":string|null}\n` +
    `"datetime": the appointment time the user stated, as a LOCAL wall-clock ISO-8601 with NO timezone/offset ` +
    `(e.g., "tomorrow at 7pm" -> the next day's date + "T19:00:00"). Do NOT convert to UTC and do NOT add Z or an offset — ` +
    `just write the exact hour the user said. Resolve relative dates ("tomorrow","next monday","غدًا") against today. ` +
    `Default the time to 10:00 if only a date is given.\n` +
    `"location": a concrete neighborhood/district/city the user names (e.g. "Maadi","Zamalek","New Cairo"). ` +
    `Vague phrases like "near me"/"my location"/"قريب مني" are NOT a location — use null for those.\n\nUser: "${message}"`;
  try {
    const r = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(r.choices[0].message.content.trim()) || {};
    // Deterministic email/name always win — the regex is exact where the model guesses.
    const merged = { ...parsed };
    if (det.email) merged.email = det.email;
    if (det.first_name && !merged.first_name) { merged.first_name = det.first_name; if (det.last_name) merged.last_name = det.last_name; }
    if (process.env.BOOKING_DEBUG) console.error('[extract]', JSON.stringify(merged));
    return merged;
  } catch (e) {
    if (process.env.BOOKING_DEBUG) console.error('[extract ERROR]', e.message);
    return det; // even if the model call fails, identity still comes through
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
  for (const k of ['first_name', 'last_name', 'email', 'pet_name', 'datetime', 'reason', 'location']) {
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

  // 4) Choose a vet from REAL approved vets in the DB, ranked nearest-first.
  //    We show options and let the user pick (rather than silently auto-picking).
  if (!d.vet_id) {
    // (a) Already presented options on a previous turn → resolve the user's pick.
    if (state.step === 'vet' && Array.isArray(d.vet_candidates) && d.vet_candidates.length) {
      const picked = resolveVetChoice(message, d.vet_candidates);
      if (picked) { d.vet_id = picked.vet_user_id; d.vet = picked; }
    }

    // (a2) If the user is answering the "which area?" fallback, capture it here.
    if (!d.vet_id && state.step === 'vet_location') {
      if (info.location) d.location = info.location;
      else if (!isSkipArea(message) && /^[\p{L}\s.'-]{2,40}$/u.test(message.trim())) {
        d.location = message.trim(); // treat their short reply as the area
      }
      // else: they skipped → proceed with no location (show all).
    }

    // (b) Not resolved yet → fetch real ranked vets and present them.
    if (!d.vet_id) {
      const res = await tools.findAvailableVets.execute({ limit: 4, location: d.location || undefined });
      const list = res?.success ? res.vets : [];
      if (list.length === 0) return finish(M.noVet, [{ type: 'text', data: { content: M.noVet } }]);

      // If the user's message already names one of them, honor it immediately.
      // Name-only match here (allowOrdinal:false) so "at 3pm" isn't read as "vet #3".
      const direct = resolveVetChoice(message, list, { allowOrdinal: false });
      if (direct) {
        d.vet_id = direct.vet_user_id; d.vet = direct;
      } else if (list.length === 1) {
        // Only one real vet exists — no point asking; pick it.
        d.vet_id = list[0].vet_user_id; d.vet = list[0];
      } else if (!d.location && !d.asked_location) {
        // Fallback: we can't rank by proximity without a location — ask their area
        // once so proximity works even for users with no saved lat/lng.
        d.asked_location = true;
        return ask(M.askArea, 'vet_location');
      } else {
        // Present the real options (ranked if we have a location) and wait.
        d.vet_candidates = list;
        state.step = 'vet';
        const prompt = d.location ? M.askVetNear(d.location) : M.askVet;
        return {
          text: prompt,
          blocks: [
            { type: 'vet_options', data: { vets: list, location: d.location || null, message: prompt } },
            { type: 'text', data: { content: prompt } },
          ],
          flow_state: state,
        };
      }
    }
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
  // Booking failed — keep the chosen vet and ask for another time. Only truly
  // unusable vets reset the selection.
  d.datetime = null; state.step = 'time';
  const vname = d.vet?.name || book?.vet_name || (lang === 'ar' ? 'الطبيب' : 'the vet');
  let msg;
  if (book?.code === 'closed_day') {
    msg = M.closedDay(vname, book.available_days || []);
  } else if (book?.code === 'outside_hours') {
    const wh = book.working_hours || {};
    msg = M.outsideHours(vname, wh.start, wh.end);
  } else if (book?.code === 'slot_taken' || /already/i.test(book?.error || '')) {
    msg = M.conflict;
  } else {
    d.vet_id = null; // unknown failure — let them re-pick a vet too
    msg = book?.error || M.err;
  }
  return { ...textBlock(msg), flow_state: state };
}

export default { runBookingFlow, hasBookingIntent };
