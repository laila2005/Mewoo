/**
 * PetPluse — Canonical frontend routes for AI navigation blocks.
 *
 * The AI layer emits { type: 'navigation', data: { route } } blocks that the
 * client hands straight to react-router. A route string that does not exist in
 * `petpluse-web/src/App.jsx` silently falls through to the `*` catch-all and
 * renders the 404 page — which is exactly how `/pets` (never a real route)
 * shipped in the care-timeline feature.
 *
 * Every route the backend can send to the client is declared here, once, so a
 * typo is a missing export rather than a dead button. Keep this in sync with
 * the <Route path="…"> list in App.jsx.
 */

export const ROUTES = {
  ADD_PET: '/manage-pet?id=new',   // per-pet editor; `id=new` creates one
  MY_PETS: '/profile',             // Profile page hosts the "My Pets" section
  VETS: '/vets',
  SIGNUP: '/signup',
  LOGIN: '/login',
  APPOINTMENTS: '/profile?tab=appointments',
  LOST_FOUND: '/community#lostfound',
  COMMUNITY: '/community',
  MARKETPLACE: '/marketplace',
  EXPLORE: '/explore',
};

/**
 * Build a navigation block. Takes a value from ROUTES (not a raw string) so an
 * undefined constant fails loudly at build/test time instead of rendering a
 * button that 404s.
 */
export function navBlock(route, label) {
  if (!route) throw new Error('navBlock: unknown route (use a ROUTES constant)');
  return { type: 'navigation', data: { route, label } };
}

/**
 * Every path the frontend router actually serves. Must mirror the
 * <Route path="…"> list in petpluse-web/src/App.jsx — the eval harness asserts
 * that, so drift fails a test rather than shipping a dead link.
 */
export const KNOWN_PATHS = new Set([
  '/', '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email',
  '/marketplace', '/explore', '/community', '/pet-profile', '/owner-profile',
  '/vets', '/vet-booking', '/pet-shops', '/contact', '/faq', '/for-vets',
  '/privacy', '/terms', '/cookies', '/trainers', '/trainer-details',
  '/payment-success', '/lost-found', '/pulsebox', '/messages', '/profile',
  '/manage-pet', '/edit-profile', '/settings', '/appointments', '/bookings',
  '/booking-details', '/checkout', '/vendor-dashboard', '/pro-dashboard', '/admin',
]);

/**
 * Plausible-sounding paths the model invents, mapped to the real thing.
 * Observed in production: it wrote "[Create Account](/create-account)", which
 * is not a route, so the user tapped it and landed on the 404 page.
 */
const ALIASES = new Map([
  ['/create-account', '/signup'], ['/createaccount', '/signup'],
  ['/register', '/signup'], ['/sign-up', '/signup'], ['/new-account', '/signup'],
  ['/sign-in', '/login'], ['/signin', '/login'], ['/log-in', '/login'],
  ['/pets', '/profile'], ['/my-pets', '/profile'], ['/mypets', '/profile'],
  ['/adopt', '/community#adoptions'], ['/adoption', '/community#adoptions'], ['/adoptions', '/community#adoptions'],
  ['/hosting', '/community#hosting'], ['/host', '/community#hosting'],
  ['/lost', '/community#lostfound'], ['/lost-and-found', '/community#lostfound'], ['/found', '/community#lostfound'],
  ['/shop', '/marketplace'], ['/store', '/marketplace'], ['/products', '/marketplace'],
  ['/book', '/vets'], ['/booking', '/vets'], ['/book-appointment', '/vets'],
  ['/appointment', '/profile?tab=appointments'],
  ['/vet', '/vets'], ['/veterinarians', '/vets'], ['/trainer', '/trainers'],
  ['/account', '/profile'], ['/dashboard', '/profile'], ['/home', '/'],
]);

/**
 * Resolve a model-authored internal path to a real route, or null if it is not
 * one. Never returns a path the router cannot serve.
 */
export function resolveAppPath(path) {
  if (typeof path !== 'string') return null;
  const clean = path.trim();
  // Internal, absolute paths only — no protocol-relative or external URLs.
  if (!clean.startsWith('/') || clean.startsWith('//')) return null;
  const base = (clean.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/').toLowerCase();
  if (KNOWN_PATHS.has(base)) return clean;
  return ALIASES.get(base) || null;
}

/**
 * Rewrite markdown links in model prose so they can never 404.
 *
 * The ROUTES contract only covers navigation BLOCKS; the model can also just
 * write "[Create Account](/create-account)" in its text, which bypassed it
 * entirely. A link to a real route is kept, a recognisable alias is corrected,
 * and anything else loses the link but keeps its words — a plain sentence beats
 * a button that dead-ends.
 */
export function sanitizeInternalLinks(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/\[([^\]\n]+)\]\((\/[^)\s]*)\)/g, (_m, label, path) => {
    const resolved = resolveAppPath(path);
    return resolved ? `[${label}](${resolved})` : label;
  });
}

export default ROUTES;
