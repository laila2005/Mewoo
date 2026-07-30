/**
 * PetPulse — Migration: clinic assistant (secretary) accounts.
 * A vet can create an assistant user tied to their clinic. The assistant helps
 * with reception (accept/cancel appointments) without full vet access.
 *   • user_role gains 'clinic_assistant'
 *   • users.manager_vet_id  — the vet an assistant works under
 *   • users.assistant_disabled — vet can enable/disable the seat
 * Usage: node backend/scripts/migrate_clinic_assistant.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    // ALTER TYPE ... ADD VALUE runs in its own statement (autocommit) — safe.
    await client.query(`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'clinic_assistant';`);
    console.log("✅ user_role gained 'clinic_assistant'.");

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS manager_vet_id uuid REFERENCES users(id) ON DELETE SET NULL;`);
    console.log('✅ users.manager_vet_id added.');

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS assistant_disabled boolean DEFAULT false;`);
    console.log('✅ users.assistant_disabled added.');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_manager_vet ON users (manager_vet_id) WHERE manager_vet_id IS NOT NULL;`);
    console.log('✅ index idx_users_manager_vet ready.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
