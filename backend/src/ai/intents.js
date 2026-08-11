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

export default { isCapabilityQuestion };
