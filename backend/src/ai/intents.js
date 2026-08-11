/**
 * PetPulse — Deterministic intent detectors.
 *
 * Anything these catch is answered without a model call: ~330ms and zero tokens,
 * against ~8-18s and ~1900 tokens when a question falls through to the LLM. A
 * near-miss here is therefore expensive twice over — slow, and often wrong,
 * because the model picks a tool to justify itself. "what you can do" and
 * "what can u do" both missed and came back as a list of veterinarians.
 *
 * Kept in one module so they can be unit-tested directly rather than copied
 * into a test, which is how the phrasing drift went unnoticed.
 */

/** "who are you" / "what can you do" / "what u can do" / Arabic equivalents. */
export function isCapabilityQuestion(message = '') {
  const m = String(message);
  return (
    /\b(who|what)\s+(are|r)\s+(you|u)\b/i.test(m) ||
    // Tolerant of word order AND the "u"/"r" abbreviations.
    /\bwhat\s+(?:can\s+(?:you|u)|(?:you|u)\s+can|do\s+(?:you|u)|(?:you|u))\s+(?:do|help|offer|handle)\b/i.test(m) ||
    /\b(how|what)\s+(?:can|do)\s+(?:you|u)\s+help\b/i.test(m) ||
    /\b(your\s+(?:name|capabilities|features)|what\s+is\s+petpulse|help\s+me\s+with\s+what)\b/i.test(m) ||
    /\b(what|which)\s+(?:services|features|things)\b.{0,20}\b(you|offer|available)\b/i.test(m) ||
    /من أنت|مين انت|ماذا تفعل|كيف تساعد|ماذا يمكنك|ايه اللي تقدر|إيه اللي تقدر|ما هو بيت ?بالس|بتعمل ايه|بتعمل إيه/.test(m)
  );
}

/**
 * Is this reply plausibly a PET'S NAME, rather than a sentence, a command, or a
 * quick-reply chip the user tapped?
 *
 * The booking flow accepted any letters-only string up to 38 characters, so a
 * pet was registered in production as "فحص الأعراض" — the label of the
 * "Check Symptoms" suggestion chip. A name is short and not a request.
 */
const NOT_A_NAME = [
  // Quick-reply chips and common commands, EN + AR.
  /\b(check|book|find|search|show|tell|help|adopt|cancel|reschedul|register|create|open|start|explore)\b/i,
  /\b(symptom|appointment|vaccinat|vet|veterinarian|trainer|clinic|adoption|account|schedule|pet shop|marketplace)\b/i,
  /\b(yes|no|ok|okay|thanks|thank you|hello|hi|hey)\b/i,
  /فحص|احجز|أحجز|حجز|موعد|ابحث|اعرض|ساعد|تبن[يى]|إلغاء|ألغ|تطعيم|أعراض|الأعراض|طبيب|عيادة|حساب|متجر/,
  /\?|؟/,           // a question is never a name
];

export function looksLikePetName(text = '') {
  const raw = String(text || '').trim();
  if (!raw) return false;
  // Letters, spaces and a few name punctuation marks only — no digits, no emoji.
  if (!/^[\p{L}][\p{L}\s.'’-]*$/u.test(raw)) return false;
  if (raw.length < 2 || raw.length > 24) return false;
  // Real pet names are one or two words ("Luna", "Sir Barks"). Three is the
  // generous ceiling; beyond that it is a sentence.
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;
  if (NOT_A_NAME.some((re) => re.test(raw))) return false;
  return true;
}

export default { isCapabilityQuestion, looksLikePetName };
