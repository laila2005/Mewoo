/**
 * PetPluse — shop slugs.
 *
 * A shop's public address has to be stable. Storefront links were previously
 * `/marketplace?shop=<name>`, matched on the name itself, so renaming a shop
 * broke every link ever shared and two shops with the same name showed each
 * other's products. The slug fixes both: generated once, never regenerated on
 * rename, and made unique at creation time.
 *
 * Everything here is pure — no database — so the rules can be unit-tested.
 */

// Arabic is transliterated rather than percent-encoded. A real shop name like
// "اكل كلاب" would otherwise become /shop/%D8%A7%D9%83%D9%84-... which is
// unreadable the moment it is pasted into WhatsApp, where these links live.
const AR_MAP = {
  'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ٱ': 'a',
  'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
  'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sh',
  'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a',
  'ئ': 'y', 'ؤ': 'w', 'ء': '',
  // Arabic-Indic digits, so "متجر ٢" does not lose its number.
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/** Slugs are namespaced under /shop/, so app route names cannot collide — but
 *  these would be confusing or ambiguous as a shop address. */
const RESERVED = new Set(['new', 'edit', 'admin', 'api', 'null', 'undefined']);

export const MAX_SLUG_LENGTH = 60;

/**
 * Turn a shop name into a URL-safe slug. Returns '' when the name carries no
 * usable characters at all — callers must fall back (see slugFromShop).
 */
export function slugify(name) {
  let s = String(name == null ? '' : name);

  // Strip Arabic harakat before transliterating; they carry no letter value.
  s = s.replace(/[ً-ْٰـ]/g, '');

  // Separate accents from their base letters so "Café" becomes "cafe" rather
  // than losing the e entirely.
  s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  s = [...s].map((ch) => (AR_MAP[ch] !== undefined ? AR_MAP[ch] : ch)).join('');

  s = s.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')   // anything left that is not URL-safe
    .replace(/^-+|-+$/g, '')       // no leading or trailing separator
    .replace(/-{2,}/g, '-');       // no runs

  if (s.length > MAX_SLUG_LENGTH) {
    // Cut on a word boundary so the slug stays readable.
    s = s.slice(0, MAX_SLUG_LENGTH).replace(/-+[^-]*$/, '').replace(/-+$/, '');
  }

  return RESERVED.has(s) ? `${s}-shop` : s;
}

/**
 * A slug for a shop that always produces something usable.
 * @param {{ id?: string, name?: string }} shop
 */
export function slugFromShop(shop = {}) {
  const base = slugify(shop.name);
  if (base) return base;
  // A name of only punctuation or unmapped script still needs an address.
  const short = String(shop.id || '').replace(/-/g, '').slice(0, 8);
  return short ? `shop-${short}` : 'shop';
}

/**
 * Make a slug unique against slugs already in use.
 *
 * Four live shops are called "E2E Test Shop"; without this they would all
 * claim the same address and three of them would be unreachable.
 *
 * @param {string} base      candidate slug
 * @param {Set<string>} taken lowercased slugs already assigned
 */
export function uniqueSlug(base, taken = new Set()) {
  const root = base || 'shop';
  if (!taken.has(root)) return root;
  // Start at 2: the first shop keeps the bare slug, so an existing link to it
  // never changes when a second shop with the same name signs up.
  for (let n = 2; n < 10000; n++) {
    const candidate = `${root}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`uniqueSlug: could not find a free slug for "${root}"`);
}

/** Is this a slug we would ever have generated? Used to validate route params. */
export function isValidSlug(s) {
  return typeof s === 'string'
    && s.length > 0
    && s.length <= MAX_SLUG_LENGTH
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s);
}

export default { slugify, slugFromShop, uniqueSlug, isValidSlug, MAX_SLUG_LENGTH };
