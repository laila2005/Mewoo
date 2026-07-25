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

// Urgent-but-not-immediately-life-threatening signals → "see a vet within ~24h".
// High-precision; anything ambiguous falls through to the normal RAG/model answer.
const URGENT_PATTERNS = [
  // English
  /\b(keeps? |repeated(ly)?|been )?vomit(ing)?\b.*\b(times|day|hours|repeatedly|again)\b/i,
  /\bdiarrh?ea\b/i,
  /\b(won'?t|not|refus\w*|stopped) eating\b|\bloss of appetite|not drinking\b/i,
  /\blethargic|very (weak|tired)|no energy|not moving\b/i,
  /\blimp(ing)?\b|can'?t (walk|stand)|holding up (his|her|its|the) (leg|paw)|not bearing weight\b/i,
  /\bswollen|swelling|abscess|growing lump\b/i,
  /\b(eye|ear) (infection|injury|swollen|discharge)|squinting\b/i,
  /\bstraining to (pee|urinate)|can'?t (pee|urinate)\b/i,
  /\bfever|very hot|warm to the touch\b/i,
  /\blimping|hobbling\b/i,
  // Arabic
  /قيء|يتقيأ|تتقيأ|تقيؤ|إسهال|اسهال/,
  /لا يأكل|رفض الأكل|فقدان الشهية|لا يشرب/,
  /خمول|ضعف شديد|لا يتحرك/,
  /يعرج|لا يستطيع المشي|لا يقف/,
  /تورم|خراج|ورم/,
  /التهاب (العين|الأذن)|إفرازات/,
  /صعوبة في التبول|لا يستطيع التبول/,
  /حمى|حرارة/,
];

/** Is the message an Arabic-script message? */
export function isArabic(text = '') {
  return /[؀-ۿ]/.test(text);
}

/** Deterministic: does the message describe a probable emergency? */
export function detectEmergency(message = '') {
  return EMERGENCY_PATTERNS.some((re) => re.test(message));
}

/** Deterministic: urgent (needs a vet soon) but not immediately life-threatening. */
export function detectUrgent(message = '') {
  return URGENT_PATTERNS.some((re) => re.test(message));
}

/** Coarse severity tier: 'emergency' | 'urgent' | null (routine → normal flow). */
export function assessSeverity(message = '') {
  if (detectEmergency(message)) return 'emergency';
  if (detectUrgent(message)) return 'urgent';
  return null;
}

/** Structured "urgent — see a vet soon" response (language-matched). Never diagnoses. */
export function urgentResponse(message = '') {
  const ar = isArabic(message);
  const content = ar
    ? '⚠️ ما تصفه يستدعي زيارة طبيب بيطري قريبًا — يُفضّل خلال 24 ساعة. ' +
      'حافظ على راحة حيوانك، وفّر له الماء النظيف، وراقب الأعراض؛ إذا ساءت الحالة عامِلها كطوارئ. ' +
      'يمكنني مساعدتك في حجز موعد مع طبيب قريب. (أنا لست طبيبًا بيطريًا ولا أستطيع التشخيص.)'
    : "⚠️ Based on what you describe, your pet should see a vet soon — ideally within 24 hours. " +
      'Keep them calm and hydrated and watch the symptoms; if they worsen, treat it as an emergency. ' +
      "I can help you book a nearby vet. (I'm not a veterinarian and can't diagnose.)";
  return {
    blocks: [
      { type: 'text', data: { content } },
      { type: 'navigation', data: { route: '/explore', label: ar ? 'احجز مع طبيب بيطري' : 'Book a Vet' } },
    ],
  };
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

export default { detectEmergency, detectUrgent, assessSeverity, emergencyResponse, urgentResponse, isArabic };
