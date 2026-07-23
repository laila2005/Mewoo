/**
 * PetPulse — Safety layer (Phase 3)
 *
 * Deterministic guardrails that must NOT depend on the model complying:
 *   - Emergency detection (bilingual EN/AR) → forces an emergency response
 *     before any model call, so life-threatening cases are never missed if the
 *     model misbehaves.
 */

// Life-threatening signals. Kept deliberately high-precision.
const EMERGENCY_PATTERNS = [
  // English
  /\bseizure|seizing|convuls/i,
  /\bnot breathing|can'?t breathe|difficulty breathing|struggling to breathe|choking\b/i,
  /\bcollaps|unconscious|unresponsive|passed out\b/i,
  /\b(severe|heavy) bleeding|bleeding (heavily|badly)|won'?t stop bleeding\b/i,
  /\bpoison|toxic|ate (chocolate|xylitol|rat poison|antifreeze|grapes|raisins)|ingested\b/i,
  /\bbloat|gdv|distended (stomach|abdomen)|twisted stomach\b/i,
  /\bhit by (a )?car|hit by (a )?vehicle|ran over\b/i,
  /\bheatstroke|heat stroke|overheating\b/i,
  /\bpale (gums|tongue)|blue (gums|tongue)\b/i,
  /\bblood in (vomit|stool|urine)|vomiting blood\b/i,
  // Arabic
  /نوبة|تشنج|اختلاج/,
  /لا يتنفس|صعوبة في التنفس|يختنق|اختناق/,
  /فاقد الوعي|إغماء|لا يستجيب|أغمي عليه/,
  /نزيف (شديد|حاد)|ينزف بغزارة/,
  /تسمم|سم|ابتلع|أكل شوكولاتة|سم فئران/,
  /انتفاخ|نفاخ المعدة|التواء المعدة/,
  /دهسته سيارة|صدمته سيارة/,
  /ضربة شمس|ارتفاع الحرارة الشديد/,
];

/** Is the message an Arabic-script message? */
export function isArabic(text = '') {
  return /[؀-ۿ]/.test(text);
}

/** Deterministic: does the message describe a probable emergency? */
export function detectEmergency(message = '') {
  return EMERGENCY_PATTERNS.some((re) => re.test(message));
}

/** Structured emergency response (language-matched). Never diagnoses. */
export function emergencyResponse(message = '') {
  const ar = isArabic(message);
  const content = ar
    ? '🚨 يبدو أن هذه حالة طارئة. يُرجى التواصل فورًا مع أقرب عيادة بيطرية للطوارئ. ' +
      'حافظ على هدوئك، لا تُعطِ أي أدوية، وانقل حيوانك الأليف بحذر. ' +
      '(أنا لست طبيبًا بيطريًا ولا يمكنني تشخيص الحالة.)'
    : '🚨 This sounds like a medical emergency. Please contact your nearest emergency ' +
      'veterinary clinic immediately. Stay calm, do not give any medication, and transport ' +
      'your pet carefully. (I am not a veterinarian and cannot diagnose this.)';

  return {
    blocks: [
      { type: 'text', data: { content } },
      { type: 'navigation', data: { route: '/explore', label: ar ? 'ابحث عن طبيب بيطري' : 'Find a Vet' } },
    ],
  };
}

export default { detectEmergency, emergencyResponse, isArabic };
