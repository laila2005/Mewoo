import { query } from './db.js';

/**
 * Soft-launch feature flags. A feature is ENABLED unless explicitly set false,
 * so new features default to live. At launch we turn OFF the ones that depend on
 * partners we haven't onboarded (vets, marketplace, paid subscriptions).
 *
 * Stored as a single JSONB row in platform_settings (key = 'feature_flags').
 * Read is cached for 30s so we don't hit the DB on every request.
 */
export const FEATURE_DEFAULTS = {
  vets: true,
  trainers: true,
  marketplace: true,
  subscriptions: true,
  hosting: true,
  community: true,
  lost_found: true,
  adoption: true,
};

let _cache = null;
let _cacheAt = 0;
const TTL_MS = 30 * 1000;

export function invalidateFlagsCache() { _cache = null; _cacheAt = 0; }

export async function getFeatureFlags() {
  if (_cache && Date.now() - _cacheAt < TTL_MS) return _cache;
  let stored = {};
  try {
    const r = await query("SELECT value FROM platform_settings WHERE key = 'feature_flags'");
    const v = r.rows[0]?.value;
    stored = typeof v === 'string' ? JSON.parse(v) : (v || {});
  } catch (_) { /* table/row missing → defaults */ }
  _cache = { ...FEATURE_DEFAULTS, ...stored };
  _cacheAt = Date.now();
  return _cache;
}

/** True unless the flag is explicitly disabled. */
export async function isFeatureEnabled(name) {
  const flags = await getFeatureFlags();
  return flags[name] !== false;
}
