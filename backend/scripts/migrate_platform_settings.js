import { query } from '../src/config/db.js';

/**
 * Creates the platform_settings key/value table that the admin commission
 * endpoints (getPlatformSettings / updateCommissionRate) and the vendor payout
 * math depend on, and seeds the default commission rate (10%).
 * Idempotent — safe to run repeatedly.
 */
const migrate = async () => {
    try {
        console.log('🚀 Starting platform_settings migration...');

        await query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                key        VARCHAR(100) PRIMARY KEY,
                value      JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
        console.log('✅ platform_settings table ready.');

        // Seed the default commission rate only if not already set.
        await query(`
            INSERT INTO platform_settings (key, value, updated_at)
            VALUES ('commission_rate', '0.10'::jsonb, NOW())
            ON CONFLICT (key) DO NOTHING;
        `);
        console.log('✅ Default commission_rate (0.10) seeded.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
};

migrate();
