/**
 * PetPluse — Migration: community sightings for lost pets ("what neighbours say").
 * A logged-in neighbour can report spotting a lost pet; the owner is notified and
 * sightings surface on the report.
 * Usage: node backend/scripts/migrate_lost_found_sightings.js
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
    await client.query(`
      CREATE TABLE IF NOT EXISTS pet_sightings (
        id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        lost_pet_id  uuid NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
        reporter_id  uuid REFERENCES users(id) ON DELETE SET NULL,
        note         text,
        location     text,
        photo_url    text,
        created_at   timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ pet_sightings table ready.');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sightings_lost_pet ON pet_sightings (lost_pet_id, created_at DESC);`);
    console.log('✅ index idx_sightings_lost_pet ready.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
