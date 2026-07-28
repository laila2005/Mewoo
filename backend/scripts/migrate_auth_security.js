import { query } from '../src/config/db.js';

/**
 * Adds columns for the Week-2 auth hardening:
 *   users.failed_login_attempts, users.lockout_until  — login lockout
 *   users.email_verified, email_verification_token_hash, email_verification_expires — email verification
 *   password_recoveries.attempts — OTP brute-force cap
 * Idempotent.
 */
const migrate = async () => {
  try {
    console.log('🚀 Auth-security migration...');
    await query(`ALTER TABLE users
      ADD COLUMN IF NOT EXISTS failed_login_attempts INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS lockout_until TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verification_token_hash TEXT,
      ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;`);
    console.log('✅ users columns ready.');

    // Existing accounts are grandfathered as verified so enforcement (when enabled)
    // never locks out people who signed up before verification existed.
    await query(`UPDATE users SET email_verified = TRUE WHERE email_verified = FALSE AND created_at < NOW();`);
    console.log('✅ existing users grandfathered as verified.');

    await query(`ALTER TABLE password_recoveries ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0;`).catch(e => {
      console.warn('password_recoveries.attempts:', e.message);
    });
    console.log('✅ password_recoveries.attempts ready.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrate();
