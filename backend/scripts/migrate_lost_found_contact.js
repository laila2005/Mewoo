/**
 * PetPluse — Migration: privacy-preserving contact for lost reports.
 *   • lost_pets.contact_pref  — how the owner wants to be reached ('message' | 'call' | 'both')
 *   • lost_pet_phone_reveals  — audit + rate-limit ledger so phone numbers can't be scraped/spammed
 * Usage: node backend/scripts/migrate_lost_found_contact.js
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
    await client.query(`ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS contact_pref TEXT DEFAULT 'both';`);
    console.log('✅ lost_pets.contact_pref added.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS lost_pet_phone_reveals (
        id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        viewer_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        lost_pet_id  uuid NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
        created_at   timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ lost_pet_phone_reveals table ready.');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_phone_reveals_viewer_time ON lost_pet_phone_reveals (viewer_id, created_at DESC);`);
    console.log('✅ index idx_phone_reveals_viewer_time ready.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
