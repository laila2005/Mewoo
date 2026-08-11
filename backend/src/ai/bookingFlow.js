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
import { emailVetOnBooking } from '../controllers/bookingController.js';
import { parseWhen, isFutureCairo, describeWhen, cairoTodayISO } from './dateParse.js';
import { ROUTES, navBlock } from './appRoutes.js';

/** Deterministic booking-intent detector (bilingual). */
export function hasBookingIntent(message = '') {
  return /\b(book|booking|appointment|reserve)\b/i.test(message)
    // "schedule" is booking ONLY when tied to a visit — never "vaccination schedule".
    || /\bschedule\b[^.?!]{0,25}\b(appointment|visit|vet|veterinarian|clinic|check-?up|consultation)\b/i.test(message)
    || /\b(make|set up|need|want|get)\b[^.?!]{0,15}\bappointment\b/i.test(message)
    || /احجز|أحجز|حجز|موعد|ميعاد/.test(message);
}

const MESSAGES = {
  en: {
    askIdentity: "Sure — what's your name and email so I can set up your account?",
    askPet: "Great — what's your pet's name?",
    noVet: "Sorry, there are no veterinarians available right now. Please try again later.",
    booked: "✅ All set — your appointment is booked! You'll find it under your bookings.",
    err: "Sorry, something went wrong while booking. Let's try again — what date and time would you like?",
    askVet: 'Here are the available vets. Which one would you like to book with?',
    askVetNear: (loc) => `Here are vets near ${loc}, closest first. Which one would you like to book with?`,
    vetNotMatched: "I didn't catch which vet — tap one of the options above, or tell me the vet's name.",
    askArea: "Which area are you in? (e.g., Maadi, Zamalek, New Cairo) — I'll show the closest vets. Or say \"any\" to see all.",
    closedDay: (name, days) => `${name} isn't available on that day. Working days are ${days.join(', ')}. What other day works?`,
    outsideHours: (name, s, e) => `${name} works from ${s} to ${e}. Please pick a time within those hours.`,
    // Distinct causes get distinct messages. One shared "pick a date in the
    // future" made every failure look identical, so users guessed blindly.
    pickSlot: (name) => `Pick a time that suits you with ${name} — tap one below, or just tell me a day and time.`,
    notUnderstood: "I didn't catch a date and time in that. Tap one of the times below, or say something like \"Monday at 2pm\".",
    inThePast: (label) => `${label} has already passed. Tap one of the upcoming times below.`,
    slotGone: (label) => `${label} was just taken. Here's what's still open.`,
    noSlots: (name) => `${name} has no openings in the next two weeks. Would you like to pick a different vet?`,
    confirmed: (label) => `Booked for ${label}.`,
  },
  ar: {
    askIdentity: "بكل سرور! ما اسمك وبريدك الإلكتروني حتى أُنشئ حسابك؟",
    askPet: "رائع — ما اسم حيوانك الأليف؟",
    noVet: "عذرًا، لا يوجد أطباء بيطريون متاحون حاليًا. حاول لاحقًا.",
    booked: "✅ تم حجز موعدك بنجاح! ستجده ضمن حجوزاتك.",
    err: "عذرًا، حدث خطأ أثناء الحجز. لنجرّب مجددًا — ما التاريخ والوقت الذي تفضّله؟",
    askVet: 'هؤلاء الأطباء المتاحون. مع أي طبيب تودّ الحجز؟',
    askVetNear: (loc) => `هؤلاء أطباء قريبون من ${loc} (الأقرب أولاً). مع أي طبيب تودّ الحجز؟`,
    vetNotMatched: 'لم أتعرّف على الطبيب — اختر أحد الخيارات بالأعلى أو اكتب اسم الطبيب.',
    askArea: 'في أي منطقة أنت؟ (مثل: المعادي، الزمالك، التجمع) — سأعرض أقرب الأطباء. أو اكتب "أي" لعرض الكل.',
    closedDay: (name, days) => `${name} غير متاح في ذلك اليوم. أيام العمل: ${days.join('، ')}. ما اليوم الآخر المناسب؟`,
    outsideHours: (name, s, e) => `${name} يعمل من ${s} إلى ${e}. من فضلك اختر وقتًا ضمن هذه المواعيد.`,
    pickSlot: (name) => `اختر الوقت المناسب لك مع ${name} — اضغط على أحد الأوقات بالأسفل، أو أخبرني بيوم ووقت.`,
    notUnderstood: 'لم أتعرّف على تاريخ ووقت في رسالتك. اضغط على أحد الأوقات بالأسفل، أو اكتب مثلًا "الاثنين الساعة 2 مساءً".',
    inThePast: (label) => `${label} قد مضى بالفعل. اختر أحد الأوقات القادمة بالأسفل.`,
    slotGone: (label) => `${label} تم حجزه للتو. هذه الأوقات المتاحة الآن.`,
    noSlots: (name) => `لا توجد مواعيد متاحة لدى ${name} خلال الأسبوعين القادمين. تريد اختيار طبيب آخر؟`,
    confirmed: (label) => `تم الحجز يوم ${label}.`,
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

// Africa/Cairo UTC offset for a given calendar date. Egypt observes DST
// (+03:00 in summer, +02:00 in winter), so a hardcoded offset mis-stores times
// for part of the year. Derive it from the IANA zone instead.
function cairoOffset(year, month, day) {
  try {
    const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // midday — away from the DST boundary
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', timeZoneName: 'longOffset' }).formatToParts(probe);
    const tzn = parts.find(p => p.type === 'timeZoneName')?.value || '';
    const mm = tzn.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (mm) return `${mm[1]}${mm[2]}:${mm[3] || '00'}`;
  } catch { /* fall through */ }
  return '+02:00'; // Cairo standard-time fallback
}

// Treat a naive local wall-clock ("2026-07-25T19:00:00") as Africa/Cairo so "7pm"
// is stored/displayed as 7pm, using the correct DST-aware offset for that date.
// LLMs are unreliable at TZ math, so we do it here.
function toCairoISO(dt) {
  if (!dt || typeof dt !== 'string') return dt;
  if (/[Zz]$|[+-]\d{2}:?\d{2}$/.test(dt.trim())) return dt; // already has offset — keep
  const m = dt.trim().match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::\d{2})?/);
  if (!m) return dt;
  const [y, mo, d] = m[1].split('-').map(Number);
  return `${m[1]}T${m[2]}:${m[3]}:00${cairoOffset(y, mo, d)}`;
}

/** Compact chip label for a picker day, e.g. "Mon 17" / "الاثنين 17". */
function shortDayLabel(date, lang = 'en') {
  const [y, m, dd] = String(date).split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, dd, 12));
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'UTC', weekday: 'short', day: 'numeric',
  }).format(at);
}

/**
 * Advance the booking flow by one turn.
 * @returns {Promise<{text, blocks, flow_state}>}
 */
export async function runBookingFlow({ message, session, ctx, tools, lang = 'en' }) {
  const state = session.flow_state?.active ? session.flow_state : { active: true, step: 'start', data: {}, lang };
  // Lock the language for the whole flow — a short Latin reply ("cici") must not
  // flip an Arabic booking to English (or vice-versa) mid-way.
  lang = state.lang || lang;
  state.lang = lang;
  const M = MESSAGES[lang] || MESSAGES.en;
  const d = state.data;

  // Extract whatever the user provided this turn; never overwrite with null.
  const info = await extractBookingInfo(message);
  for (const k of ['first_name', 'last_name', 'email', 'pet_name', 'reason', 'location']) {
    if (info[k]) d[k] = info[k];
  }

  // ── Date and time ──────────────────────────────────────────────────────────
  // Parsed HERE, deterministically. Two things were wrong before:
  //  * the model was asked to resolve relative dates and returned a Saturday
  //    for "next monday";
  //  * date and time were one field that was nulled on every failure, so a
  //    reply of "14:00" had no day to attach to and was rejected as "not in the
  //    future" — even when 14:00 was a slot we had just offered.
  // They are now independent fields, and a bare time binds to the day already
  // agreed (or the day whose slots we last offered).
  const anchorDate = d.date || d.offered?.date || null;
  const parsed = parseWhen(message, { anchorDate });
  let whenIssue = null; // 'past' — kept distinct from "couldn't understand"
  if (parsed.date) d.date = parsed.date;
  if (parsed.time) d.time = parsed.time;
  // The model's guess is a last resort, used only for a date our own parser
  // could not read, and never for arithmetic we can do in code.
  if (!d.date && info.datetime) {
    const viaModel = parseWhen(String(info.datetime).replace('T', ' '), {});
    if (viaModel.date) d.date = viaModel.date;
    if (viaModel.time && !d.time) d.time = viaModel.time;
  }
  if (d.date && d.date < cairoTodayISO()) {
    // The DAY itself has gone ("yesterday", "last monday"). Drop it, or a bare
    // time on the next turn would bind to a date already in the past.
    whenIssue = 'past'; d.date = null; d.time = null;
  } else if (d.date && d.time && !isFutureCairo(d.date, d.time)) {
    whenIssue = 'past';
    d.time = null;   // only the hour was wrong — KEEP the day
  }

  const ask = (content, step) => { state.step = step; return { ...textBlock(content), flow_state: state }; };
  const finish = (content, blocks) => { state.active = false; state.step = 'done'; return { text: content, blocks, flow_state: state }; };

  // 1) Identity (guest → create account). ctx.userId is set by createAccount.
  if (!ctx.userId) {
    if (d.email && d.first_name) {
      const res = await tools.createAccount.execute({ email: d.email, first_name: d.first_name, last_name: d.last_name || '' });
      if (res?.code === 'account_exists') {
        // That address belongs to a real account and this caller has not proven
        // they own it. Stop the flow and hand off to sign-in rather than looping
        // on "what's your email?" — the address was not the problem.
        d.email = null;
        state.active = false; state.step = 'done';
        const content = lang === 'ar'
          ? 'يوجد حساب بهذا البريد الإلكتروني بالفعل. سجّل الدخول أولًا وسأكمل الحجز معك. 🐾'
          : "There's already an account with that email. Please sign in and I'll finish the booking with you. 🐾";
        return {
          text: content,
          blocks: [
            navBlock(ROUTES.LOGIN, lang === 'ar' ? 'تسجيل الدخول' : 'Sign in'),
            { type: 'text', data: { content } },
          ],
          flow_state: state,
        };
      }
      if (!res?.success) return ask(M.askIdentity, 'identity');
      if (!res.already_existed) d.account = { user: res.user, temporary_password: res.temporary_password };
    } else {
      return ask(M.askIdentity, 'identity');
    }
  }

  // 2) Pet (reuse an existing pet, else register the named one).
  if (!d.pet_id) {
    // If we already asked for the pet's name, accept a bare reply ("cici", "دودو")
    // as the name. The field extractor often returns null for a one-word answer with
    // no "my pet is…" framing, which previously caused an endless re-ask loop.
    if (!d.pet_name && state.step === 'pet') {
      const raw = (message || '').trim();
      if (raw && !/@/.test(raw) && !hasBookingIntent(raw) && /^[\p{L}][\p{L}\s.'’-]{0,38}$/u.test(raw)) {
        d.pet_name = raw;
      }
    }
    const existing = await query('SELECT id FROM pets WHERE owner_id = $1 ORDER BY created_at ASC LIMIT 1', [ctx.userId]);
    if (existing.rows[0]) d.pet_id = existing.rows[0].id;
    else if (d.pet_name) {
      const res = await tools.registerPet.execute({ name: d.pet_name });
      if (res?.success) d.pet_id = res.pet.id; else return ask(M.askPet, 'pet');
    } else {
      return ask(M.askPet, 'pet');
    }
  }

  // 3) Choose a vet from REAL approved vets in the DB, ranked nearest-first.
  //    This now runs BEFORE the date/time step. Working hours and closed days
  //    belong to a specific vet, so asking for a time first meant accepting an
  //    hour we already knew was impossible and rejecting it three turns later.
  //    With the vet known we can offer that vet's real openings, which makes
  //    "outside working hours" and "closed that day" unreachable by tapping.
  //    We show options and let the user pick (rather than silently auto-picking).
  if (!d.vet_id) {
    // (a) Already presented options on a previous turn → resolve the user's pick.
    if (state.step === 'vet' && Array.isArray(d.vet_candidates) && d.vet_candidates.length) {
      const picked = resolveVetChoice(message, d.vet_candidates);
      if (picked) { d.vet_id = picked.vet_user_id; d.vet = picked; }
      else if (!info.location) {
        // Couldn't tell which vet they meant, and they didn't name a new area —
        // re-show the same options WITH a clarifying nudge instead of silently re-listing.
        return {
          text: M.vetNotMatched,
          blocks: [
            { type: 'vet_options', data: { vets: d.vet_candidates, location: d.location || null, message: M.vetNotMatched } },
            { type: 'text', data: { content: M.vetNotMatched } },
          ],
          flow_state: state,
        };
      }
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

  // 4) Date + time, now that the vet is known.
  const vetLabel = d.vet?.name || (lang === 'ar' ? 'الطبيب' : 'the vet');

  /**
   * Offer this vet's REAL open days and times as a tappable picker.
   * Every slot here has already been filtered for closed days, taken
   * appointments and past times, so anything the user taps is bookable — which
   * is why the out-of-hours and closed-day messages are now a rare fallback for
   * typed input rather than the normal path.
   */
  /**
   * This vet's real open days, cached in flow_state.
   * Loaded BEFORE anything is committed — including when the user supplied a
   * time up front ("next monday at 7:00pm"). Skipping this was letting an hour
   * outside the clinic's working hours reach bookAppointment.
   */
  const loadOpenDays = async () => {
    if (d.offered?.vet_id === d.vet_id && Array.isArray(d.offered.days)) return d.offered.days;
    const res = await tools.suggestSlots.execute({ vet_user_id: d.vet_id, days: 5 });
    const days = (res?.success && Array.isArray(res.days))
      ? res.days.map((x) => ({ date: x.date, slots: (x.slots || []).map((s) => s.time) }))
      : [];
    // Persisted so a later bare "14:00" resolves against the day we offered —
    // the piece that used to be thrown away into a text string.
    d.offered = {
      vet_id: d.vet_id,
      date: (d.date && days.some((x) => x.date === d.date)) ? d.date : (days[0]?.date || null),
      working_hours: res?.working_hours || null,
      days,
    };
    return days;
  };

  const offerPicker = async (leadText) => {
    const days = await loadOpenDays();
    if (!days.length) {
      // Fully booked or never open — let them pick another vet instead of
      // looping on a vet who can never satisfy the request.
      d.vet_id = null; d.vet = null; d.vet_candidates = null; d.offered = null;
      const msg = M.noSlots(vetLabel);
      state.step = 'vet';
      return { ...textBlock(msg), flow_state: state };
    }
    state.step = 'time';
    const content = leadText || M.pickSlot(vetLabel);
    return {
      text: content,
      blocks: [
        {
          type: 'slot_picker',
          data: {
            vet_name: vetLabel,
            working_hours: d.offered.working_hours,
            selected_date: d.offered.date,
            days: days.map((x) => ({ date: x.date, label: shortDayLabel(x.date, lang), slots: x.slots })),
            message: content,
          },
        },
        { type: 'text', data: { content } },
      ],
      flow_state: state,
    };
  };

  if (!d.date || !d.time) {
    let lead = null;
    if (whenIssue === 'past') lead = M.inThePast(describeWhen(d.date, parsed.time, lang));
    else if (state.step === 'time') lead = M.notUnderstood; // we asked and couldn't read the reply
    return await offerPicker(lead);
  }

  // We have a day AND an hour. Validate against this vet's REAL openings before
  // committing — this is what makes "outside working hours" impossible to reach
  // by tapping, and a clear, immediate message when it is typed.
  const openDays = await loadOpenDays();
  if (!openDays.length) return await offerPicker(null);

  const openThatDay = openDays.find((x) => x.date === d.date)?.slots || null;
  if (!openThatDay || !openThatDay.includes(d.time)) {
    const wh = d.offered.working_hours;
    const outside = wh?.start && wh?.end && (d.time < wh.start || d.time >= wh.end);
    const wanted = describeWhen(d.date, d.time, lang);
    d.time = null; // keep the day
    let lead;
    if (outside) lead = M.outsideHours(vetLabel, wh.start, wh.end);
    else if (!openThatDay) lead = M.closedDay(vetLabel, openDays.map((x) => shortDayLabel(x.date, lang)));
    else lead = M.slotGone(wanted);
    return await offerPicker(lead);
  }

  d.datetime = toCairoISO(`${d.date}T${d.time}:00`);

  // 5) Book.
  const book = await tools.bookAppointment.execute({
    pet_id: d.pet_id, vet_user_id: d.vet_id, appointment_time: d.datetime, reason: d.reason || 'General check-up',
  });
  if (book?.success) {
    // Email the vet about the new booking (offline-safe notification).
    emailVetOnBooking(d.vet_id, { appointment_time: book.appointment.appointment_time, reason: d.reason || 'General check-up', pet_id: d.pet_id });
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
  // Booking failed. Clear only the TIME — the day and the chosen vet survive, so
  // the user never re-answers something they already told us. Only a genuinely
  // unusable vet resets the vet selection.
  const attemptedLabel = describeWhen(d.date, d.time, lang);
  d.datetime = null; d.time = null; state.step = 'time';
  const vname = d.vet?.name || book?.vet_name || (lang === 'ar' ? 'الطبيب' : 'the vet');
  let msg;
  if (book?.code === 'closed_day') {
    msg = M.closedDay(vname, book.available_days || []);
    d.date = null; // that day is impossible for this vet — drop it too
  } else if (book?.code === 'outside_hours') {
    const wh = book.working_hours || {};
    msg = M.outsideHours(vname, wh.start, wh.end);
  } else if (book?.code === 'slot_taken' || /already/i.test(book?.error || '')) {
    msg = M.slotGone(attemptedLabel);
  } else {
    // Unknown failure — let them re-pick a vet as well, and stop here rather
    // than offering slots for a vet we no longer trust.
    d.vet_id = null; d.vet = null; d.offered = null;
    state.step = 'vet';
    return { ...textBlock(book?.error || M.err), flow_state: state };
  }

  // Re-offer this vet's real openings as a picker, with the reason on top. The
  // offered list is persisted by offerPicker, so a bare "14:00" reply still
  // resolves against the right day.
  try {
    return await offerPicker(msg);
  } catch {
    return { ...textBlock(msg), flow_state: state }; // picker is best-effort
  }
}

export { toCairoISO };
export default { runBookingFlow, hasBookingIntent, toCairoISO };
