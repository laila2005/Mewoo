/**
 * Image fallbacks.
 *
 * Two separate failures were showing broken-image icons in production:
 *
 *  1. Every product image fell back to via.placeholder.com, and that service
 *     has shut down — it no longer resolves at all. So the fallback whose one
 *     job was to prevent a broken image *was* the broken image.
 *
 *  2. Profile photos used `url || avatar`, which only catches a URL that is
 *     missing. A URL that is present but dead — a seeded Unsplash id that has
 *     since been retired, say — passes the check and then 404s, and nothing
 *     downstream catches it.
 *
 * Both are fixed the same way: a placeholder that cannot itself fail, plus an
 * onError so a live URL going dead later is caught at render time rather than
 * the next time someone looks at the page.
 */

// Inlined as a data URI on purpose. A remote placeholder can be retired (see
// above), rate-limited, or blocked; this one is part of the bundle, needs no
// network, and is already permitted by the img-src 'data:' in our CSP.
const svg = (w, h, label) =>
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
      `<rect width="${w}" height="${h}" fill="#eef2f7"/>` +
      `<g fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ` +
        `transform="translate(${w / 2 - 16} ${h / 2 - 22})">` +
        `<rect x="0" y="4" width="32" height="24" rx="3"/>` +
        `<circle cx="9" cy="13" r="3"/>` +
        `<path d="M2 24l9-9 6 6 4-4 9 9"/>` +
      `</g>` +
      `<text x="50%" y="${h / 2 + 24}" text-anchor="middle" fill="#94a3b8" ` +
        `font-family="system-ui,sans-serif" font-size="11">${label}</text>` +
    `</svg>`
  );

export const PRODUCT_PLACEHOLDER = svg(400, 300, 'No image');
export const PRODUCT_PLACEHOLDER_LG = svg(600, 600, 'No image');
export const LOGO_PLACEHOLDER = svg(150, 80, 'No logo');

/** A lettered avatar for someone with no usable photo. */
export const avatarFor = (name) =>
  `https://ui-avatars.com/api/?background=e0e7ff&color=4338ca&name=${encodeURIComponent(name || 'Pet')}`;

/**
 * onError handler. Clears itself first so a placeholder that somehow also
 * fails cannot re-enter the handler and loop.
 */
export const fallbackTo = (replacement) => (e) => {
  e.currentTarget.onerror = null;
  e.currentTarget.src = replacement;
};

/** onError for a profile photo: swap in the lettered avatar for that person. */
export const avatarFallback = (name) => fallbackTo(avatarFor(name));
