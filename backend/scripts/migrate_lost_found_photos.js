/**
 * PetPulse — Migration: multi-photo lost reports.
 * Adds lost_pets.photos (JSONB array of Cloudinary URLs). image_url stays as the cover.
 * Usage: node backend/scripts/migrate_lost_found_photos.js
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
    await client.query(`ALTER TABLE lost_pets ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;`);
    console.log('✅ lost_pets.photos (JSONB) added.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
