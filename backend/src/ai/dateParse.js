/**
 * PetPulse — Deterministic date/time parsing for the booking flow.
 *
 * Calendar arithmetic must NOT be done by the model. bookingFlow used to ask the
 * LLM to "resolve relative dates against today", and it got them wrong: from
 * Tue 2026-08-11, "next monday" came back as 2026-08-15 — a Saturday. Users then
 * got offered slots on the wrong day.
 *
 * This module owns it instead: pure functions, no model, no network, fully
 * testable. Everything is computed in Africa/Cairo, because "tomorrow" means
 * tomorrow where the user and the clinic are, not in UTC.
 *
 * Returns date and time SEPARATELY and independently. That is deliberate: a
 * reply of "14:00" carries a time and no date, and the flow needs to bind it to
 * the date already agreed earlier rather than throw the whole thing away.
 */

const TZ = 'Africa/Cairo';

const WEEKDAYS = {
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, tues: 2,
  wednesday: 3, wed: 3, thursday: 4, thu: 4, thurs: 4,
  friday: 5, fri: 5, saturday: 6, sat: 6,
  // Arabic
  'الأحد': 0, 'الاحد': 0, 'الإثنين': 1, 'الاثنين': 1, 'الثلاثاء': 2,
  'الأربعاء': 3, 'الاربعاء': 3, 'الخميس': 4, 'الجمعة': 5, 'السبت': 6,
};

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4,
  may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

/** Today's calendar date in Cairo as {y, m, d} — not the server's local date. */
export function cairoToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now); // "YYYY-MM-DD"
  const [y, m, d] = parts.split('-').map(Number);
  return { y, m, d };
}

/** Current wall-clock minutes-since-midnight in Cairo. */
export function cairoNowMinutes(now = new Date()) {
  const s = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const [h, mi] = s.split(':').map(Number);
  return h * 60 + mi;
}

/**
 * Fold Arabic-Indic (٠١٢…) and Extended Arabic-Indic (۰۱۲…) digits to ASCII.
 * Arabic users type "٧ مساءً"; without this the time is simply never seen.
 */
export function normalizeDigits(s = '') {
  return String(s)
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06F0));
}

const iso = ({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const addDays = (base, n) => {
  const dt = new Date(Date.UTC(base.y, base.m - 1, base.d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
};
const dowOf = ({ y, m, d }) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/**
 * Days to add to reach the next occurrence of `targetDow`.
 * Always STRICTLY in the future (never "today"), because a user saying "monday"
 * on a Monday means the next one, not the one already half over.
 */
function daysUntilDow(today, targetDow) {
  const delta = (targetDow - dowOf(today) + 7) % 7;
  return delta === 0 ? 7 : delta;
}

/**
 * Extract a date. Returns { date: 'YYYY-MM-DD'|null, consumed: string|null }.
 *
 * `consumed` is the exact substring the date matched, so the caller can REMOVE
 * it before looking for a time. Without that, "17/8 at 11:00" parses its time as
 * 17:00 and "aug 20 at 9am" as 20:00 — the time regex grabs the date's digits.
 */
function parseDate(text, today) {
  const t = text.toLowerCase();
  const hit = (date, consumed) => ({ date, consumed });

  // Explicit ISO date wins.
  const isoM = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoM) return hit(`${isoM[1]}-${isoM[2]}-${isoM[3]}`, isoM[0]);

  let m;
  if ((m = t.match(/\b(today|tonight)\b|اليوم|الليلة/))) return hit(iso(today), m[0]);
  if ((m = t.match(/\b(day after tomorrow|overmorrow)\b|بعد\s*غد|بعد\s*بكرة/))) return hit(iso(addDays(today, 2)), m[0]);
  if ((m = t.match(/\b(tomorrow|tmrw|tmr)\b|غدا|غدًا|بكرة|بكره/))) return hit(iso(addDays(today, 1)), m[0]);

  // "in 3 days"
  if ((m = t.match(/\bin\s+(\d{1,2})\s+days?\b|بعد\s+(\d{1,2})\s+(?:يوم|أيام|ايام)/))) {
    return hit(iso(addDays(today, Number(m[1] || m[2]))), m[0]);
  }

  // "17 aug" / "aug 17" / "17 august 2026" — BEFORE the weekday scan, so a
  // month name is never mistaken for anything else.
  if ((m = t.match(/\b(\d{1,2})\s+([a-z]{3,9})\.?(?:\s+(\d{4}))?\b/)) && MONTHS[m[2]]) {
    const y = m[3] ? Number(m[3]) : today.y;
    const cand = { y, m: MONTHS[m[2]], d: Number(m[1]) };
    // A bare "3 aug" already past this year almost certainly means next year.
    return hit(iso(!m[3] && iso(cand) < iso(today) ? { ...cand, y: y + 1 } : cand), m[0]);
  }
  if ((m = t.match(/\b([a-z]{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(\d{4}))?\b/)) && MONTHS[m[1]]) {
    const y = m[3] ? Number(m[3]) : today.y;
    const cand = { y, m: MONTHS[m[1]], d: Number(m[2]) };
    return hit(iso(!m[3] && iso(cand) < iso(today) ? { ...cand, y: y + 1 } : cand), m[0]);
  }

  // "17/8" or "17/08/2026" — day-first (Egypt convention).
  if ((m = t.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/))) {
    let y = m[3] ? Number(m[3]) : today.y;
    if (y < 100) y += 2000;
    return hit(iso({ y, m: Number(m[2]), d: Number(m[1]) }), m[0]);
  }

  // Weekday, optionally prefixed by next/this/coming. All resolve to the next
  // occurrence — "next monday" and "monday" mean the same thing to a user.
  for (const [word, dow] of Object.entries(WEEKDAYS)) {
    const re = new RegExp(`(?:\\b(?:next|this|coming|on)\\s+)?${word}\\b`, 'i');
    const wm = t.match(re);
    if (wm) return hit(iso(addDays(today, daysUntilDow(today, dow))), wm[0]);
  }

  return hit(null, null);
}

/** Extract a time. Returns 'HH:MM' (24h) or null. */
function parseTime(text) {
  const t = text.toLowerCase();

  // Arabic meridiem markers.
  const arPm = /مساء|مساءً|ليلا|ليلاً|العصر|الظهر/.test(t);
  const arAm = /صباح|صباحًا|فجرا|الفجر/.test(t);

  // "7:30pm", "7.30 pm", "19:00", "7 pm", "٧ مساءً"
  const m = t.match(/\b(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (!m) return null;

  let h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  const mer = (m[3] || '').replace(/\./g, '');

  if (h > 23 || min > 59) return null;

  if (mer.startsWith('p') || (!mer && arPm)) {
    if (h < 12) h += 12;
  } else if (mer.startsWith('a') || (!mer && arAm)) {
    if (h === 12) h = 0;
  } else if (!m[2] && !mer && h >= 1 && h <= 7) {
    // A bare small hour with no meridiem: "at 7" for a clinic almost certainly
    // means 19:00, not 07:00. Flagged as assumed so the caller can confirm.
    h += 12;
  }

  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * Parse a booking date/time out of free text.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {Date}   [opts.now]        - clock (injectable for tests)
 * @param {string} [opts.anchorDate] - date already agreed in the conversation;
 *                                     used when the user replies with only a time
 * @returns {{date: string|null, time: string|null, dateSource: string, timeAssumed: boolean}}
 */
export function parseWhen(text, { now = new Date(), anchorDate = null } = {}) {
  const raw = normalizeDigits(String(text || ''));
  const today = cairoToday(now);

  const { date, consumed } = parseDate(raw, today);
  // Strip the date's own text before hunting for a time, so its digits cannot be
  // misread as an hour ("17/8 at 11:00" -> 11:00, not 17:00).
  const timeText = consumed ? raw.toLowerCase().replace(consumed.toLowerCase(), ' ') : raw;
  const time = parseTime(timeText);

  // Bare time with no date → reuse the date already established in the flow.
  // This is the whole point: "14:00" after we offered slots on 2026-08-17 must
  // mean 2026-08-17T14:00, not "unparseable" and not today (already past).
  const resolvedDate = date || (time && anchorDate ? anchorDate : null);

  return {
    date: resolvedDate,
    time,
    dateSource: date ? 'stated' : (resolvedDate ? 'anchor' : 'none'),
    timeAssumed: Boolean(time && !/am|pm|a\.m|p\.m|:|مساء|صباح/i.test(raw)),
  };
}

/** True when a Cairo date+time is still in the future. */
export function isFutureCairo(date, time, now = new Date()) {
  if (!date || !time) return false;
  const today = iso(cairoToday(now));
  if (date > today) return true;
  if (date < today) return false;
  const [h, mi] = time.split(':').map(Number);
  return h * 60 + mi > cairoNowMinutes(now);
}

/** Human label for confirmation echo, e.g. "Monday, 17 August at 14:00". */
export function describeWhen(date, time, lang = 'en') {
  if (!date) return '';
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  const day = new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  }).format(dt);
  if (!time) return day;
  return lang === 'ar' ? `${day} الساعة ${time}` : `${day} at ${time}`;
}

export default { parseWhen, isFutureCairo, describeWhen, cairoToday, cairoNowMinutes };
