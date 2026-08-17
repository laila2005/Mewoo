/**
 * PetPluse — deterministic, explainable matching helpers (no AI/embeddings).
 *
 * Prod embeddings are unreliable (Vercel can't reach the Ollama embed server), so
 * matching is rule-based and transparent: every match carries human-readable
 * reasons, and results are presented as "possible matches", never certainties.
 */

/** Lowercase, strip diacritics + punctuation, collapse to plain tokens. */
export function normalize(s = '') {
  return String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['the', 'and', 'a', 'an', 'of', 'in', 'near', 'at', 'my', 'is', 'with', 'for', 'to', 'on']);

export function tokenSet(s = '') {
  return new Set(normalize(s).split(/\s+/).filter(w => w.length >= 2 && !STOP.has(w)));
}

/** Containment overlap 0..1 (intersection / smaller set) — forgiving of free text. */
export function tokenOverlap(a, b) {
  const A = tokenSet(a), B = tokenSet(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / Math.min(A.size, B.size);
}

const sameNorm = (a, b) => !!(a && b && normalize(a) === normalize(b));

/**
 * Score a lost_pets candidate against a query (a found sighting or a searcher).
 * q: { species, breed, area, description, date }
 * @returns {{score:number, reasons:string[]}}
 */
export function scoreLostFoundMatch(candidate, q = {}) {
  const reasons = [];
  let score = 0;
  if (q.species) {
    if (sameNorm(candidate.species, q.species)) { score += 40; reasons.push('Same species'); }
    else return { score: 0, reasons: ['Different species'] };
  }
  if (q.breed && candidate.breed) {
    const ov = tokenOverlap(candidate.breed, q.breed);
    if (ov > 0) { score += Math.round(ov * 25); reasons.push('Breed matches'); }
  }
  if (q.area && candidate.last_seen_location) {
    const ov = tokenOverlap(candidate.last_seen_location, q.area);
    if (ov > 0) { score += Math.round(ov * 20); reasons.push('Nearby area'); }
  }
  if (q.description && candidate.description) {
    const ov = tokenOverlap(candidate.description, q.description);
    if (ov > 0) { score += Math.round(ov * 10); reasons.push('Similar description'); }
  }
  const lostAt = candidate.lost_time || candidate.created_at;
  if (q.date && lostAt) {
    const days = Math.abs((new Date(q.date) - new Date(lostAt)) / 86400000);
    if (!isNaN(days) && days <= 14) { score += Math.round((1 - days / 14) * 10); reasons.push('Timing lines up'); }
  }
  return { score: Math.min(100, score), reasons };
}

/**
 * Score an adoptable pet against preferences.
 * prefs: { species, breed, max_age, gender, location }
 * @returns {{score:number, reasons:string[]}}
 */
export function scoreAdoptionMatch(pet, prefs = {}) {
  const reasons = [];
  let score = 0;
  if (prefs.species) {
    if (sameNorm(pet.species, prefs.species)) { score += 40; reasons.push('Species match'); }
    else return { score: 0, reasons: ['Different species'] };
  }
  if (prefs.breed && pet.breed) {
    const ov = tokenOverlap(pet.breed, prefs.breed);
    if (ov > 0) { score += Math.round(ov * 25); reasons.push('Breed match'); }
  }
  if (prefs.gender && pet.gender && sameNorm(pet.gender, prefs.gender)) { score += 10; reasons.push('Preferred gender'); }
  if (prefs.max_age != null && prefs.max_age !== '' && pet.age_years != null) {
    if (Number(pet.age_years) <= Number(prefs.max_age)) { score += 15; reasons.push('Within age range'); }
  }
  if (prefs.location && pet.location) {
    const ov = tokenOverlap(pet.location, prefs.location);
    if (ov > 0) { score += Math.round(ov * 15); reasons.push('Near you'); }
  }
  return { score: Math.min(100, score), reasons };
}

export default { normalize, tokenSet, tokenOverlap, scoreLostFoundMatch, scoreAdoptionMatch };
