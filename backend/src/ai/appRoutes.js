/**
 * PetPulse — Canonical frontend routes for AI navigation blocks.
 *
 * The AI layer emits { type: 'navigation', data: { route } } blocks that the
 * client hands straight to react-router. A route string that does not exist in
 * `petpulse-web/src/App.jsx` silently falls through to the `*` catch-all and
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

export default ROUTES;
