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
  // Poisoning — require an ingestion action or an unambiguous toxin, so a general
  // "is X toxic?" / "what foods are toxic?" question does NOT trigger an emergency.
  /\b(swallowed|ingested|ate|eaten|got into|drank|licked|chewed)\b[^.?!]{0,40}\b(poison|toxic|chocolate|xylitol|rat ?poison|antifreeze|grape|raisin|bleach|detergent|onion|garlic|medication|pills?|ibuprofen|advil|tylenol|acetaminophen|paracetamol|aspirin|naproxen|human (food|meds?))\b/i,
  /\b(been |was |is |got )?poisoned\b/i,
  /\brat ?poison\b|\bantifreeze\b/i,
  /\bbloat|gdv|distended (stomach|abdomen)|twisted stomach\b/i,
  /\bhit by (a )?car|hit by (a )?vehicle|ran over\b/i,
  /\bheatstroke|heat stroke|overheating\b/i,
  /\bpale (gums|tongue)|blue (gums|tongue)\b/i,
  /blood in .{0,15}\b(vomit|stool|urine|poop|pee|feces|diarrhea)\b|vomiting blood|coughing up blood|bloody (vomit|stool|urine|diarrhea)/i,
  /\b(can'?t|cannot|unable to|not able to|struggling to) (pee|urinate|poop|defecate)\b|blocked (bladder|urethra)|urinary blockage/i,
  // Arabic
  /نوبة|تشنج|اختلاج/,
  /لا يتنفس|صعوبة في التنفس|يختنق|اختناق/,
  /فاقد الوعي|إغماء|لا يستجيب|أغمي عليه/,
  /نزيف (شديد|حاد)|ينزف بغزارة/,
  // "سم" (poison) alone is a substring of "اسمي" (my name) etc. — require a real
  // poisoning term or an ingestion + toxin, never the bare two letters.
  /تسمم|سم فئران|أكل شوكولاتة|ابتلع (سم|دواء|شيء)|بلع (سم|دواء)|أكل سم/,
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
  /straining (to (pee|urinate|poop|defecate)|when|while)|keeps? straining|difficulty (peeing|urinating|pooping)/i,
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

// Human medications & substances toxic to pets — flag ANY mention so we WARN
// (never answer with a dose). Human painkillers can be fatal to a cat or dog.
const TOXIC_MED_PATTERNS = [
  /\b(ibuprofen|advil|motrin|nurofen|paracetamol|acetaminophen|tylenol|aspirin|naproxen|aleve|diclofenac|voltaren|xylitol|pseudoephedrine|adderall)\b/i,
  /\b(give|feed|administer|dose|dosage|how much|can i give)\b[^.?!]{0,45}\b(dog|cat|puppy|kitten|pet)\b[^.?!]{0,25}\b(medicine|medication|painkiller|pain killer|human (meds?|medicine)|pill|tablet|drug)\b/i,
  /\b(human (medicine|meds?|painkillers?|drugs?)|painkillers?)\b[^.?!]{0,25}\b(dog|cat|pet|puppy|kitten)\b/i,
  /بروفين|بروفن|إيبوبروفين|باراسيتامول|بنادول|أسبرين|زيليتول|فولتارين/,
  /(أعطي|أعطى|جرعة).{0,30}(كلب|قط|قطة|حيوان).{0,30}(دواء|مسكن|علاج بشري|حبوب|باراسيتامول|بروفين)/,
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

/** Deterministic: is the user asking about giving a pet a possibly-toxic (human) medication? */
export function detectToxicMedication(message = '') {
  return TOXIC_MED_PATTERNS.some((re) => re.test(message));
}

/** Strong, safety-first warning about human meds toxic to pets. Never gives a dose. */
export function toxicMedResponse(message = '', { canBook = true } = {}) {
  const ar = isArabic(message);
  const content = ar
    ? '⚠️ من فضلك لا تفعل — كثير من الأدوية البشرية (مثل الإيبوبروفين/بروفين، الباراسيتامول/البنادول، الأسبرين) سامّة للقطط والكلاب وقد تكون قاتلة حتى بجرعة صغيرة. لا تُعطِ حيوانك أي دواء بشري دون إشراف طبيب بيطري. وإذا سبق أن أعطيته دواءً بشريًا أو ابتلعه، عامل الأمر كحالة طارئة وتواصل مع عيادة بيطرية فورًا. (أنا لست طبيبًا بيطريًا.)'
    : "⚠️ Please don't — many human medicines (ibuprofen/Advil, paracetamol/acetaminophen/Tylenol, aspirin) are toxic to cats and dogs and can be dangerous even in small doses. Never give your pet any human medication without a vet's guidance. If you've already given it — or your pet swallowed some — treat it as an emergency and contact a vet clinic right away. (I'm not a veterinarian.)";
  const blocks = [{ type: 'text', data: { content } }];
  if (canBook) blocks.push({ type: 'navigation', data: { route: '/vets', label: ar ? 'ابحث عن طبيب بيطري' : 'Find a Vet' } });
  return { blocks };
}

/** Coarse severity tier: 'emergency' | 'urgent' | null (routine → normal flow). */
export function assessSeverity(message = '') {
  if (detectEmergency(message)) return 'emergency';
  if (detectUrgent(message)) return 'urgent';
  return null;
}

/** Structured "urgent — see a vet soon" response (language-matched). Never diagnoses. */
export function urgentResponse(message = '', { canBook = true } = {}) {
  const ar = isArabic(message);
  const bookAr = canBook ? ' يمكنني مساعدتك في حجز موعد مع طبيب قريب.' : '';
  const bookEn = canBook ? ' I can help you book a nearby vet.' : '';
  const content = ar
    ? '⚠️ ما تصفه يستدعي زيارة طبيب بيطري قريبًا — يُفضّل خلال 24 ساعة. ' +
      'حافظ على راحة حيوانك، وفّر له الماء النظيف، وراقب الأعراض؛ إذا ساءت الحالة عامِلها كطوارئ.' +
      bookAr + ' (أنا لست طبيبًا بيطريًا ولا أستطيع التشخيص.)'
    : "⚠️ Based on what you describe, your pet should see a vet soon — ideally within 24 hours. " +
      'Keep them calm and hydrated and watch the symptoms; if they worsen, treat it as an emergency.' +
      bookEn + " (I'm not a veterinarian and can't diagnose.)";
  const blocks = [{ type: 'text', data: { content } }];
  if (canBook) blocks.push({ type: 'navigation', data: { route: '/vets', label: ar ? 'احجز مع طبيب بيطري' : 'Book a Vet' } });
  return { blocks };
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
      { type: 'navigation', data: { route: '/vets', label: ar ? 'ابحث عن طبيب بيطري' : 'Find a Vet' } },
    ],
  };
}

export default { detectEmergency, detectUrgent, detectToxicMedication, assessSeverity, emergencyResponse, urgentResponse, toxicMedResponse, isArabic };
