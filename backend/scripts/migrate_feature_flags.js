import { query } from '../src/config/db.js';

/**
 * Seeds the soft-launch feature flags: community features live, partner-dependent
 * features (vets, marketplace, paid subscriptions) OFF ("coming soon") until a
 * real partner is onboarded. Admins flip these live from AdminPulse.
 * Only seeds if not already set (won't clobber an existing config).
 */
const migrate = async () => {
  try {
    console.log('🚀 Seeding feature_flags...');
    const launch = {
      vets: false, trainers: true, marketplace: false, subscriptions: false,
      hosting: true, community: true, lost_found: true, adoption: true,
    };
    await query(
      `INSERT INTO platform_settings (key, value, updated_at)
       VALUES ('feature_flags', $1::jsonb, NOW())
       ON CONFLICT (key) DO NOTHING`,
      [JSON.stringify(launch)]
    );
    const r = await query("SELECT value FROM platform_settings WHERE key = 'feature_flags'");
    console.log('✅ feature_flags =', JSON.stringify(r.rows[0]?.value));
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
