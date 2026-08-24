/**
 * PetPulse — Migration: shop owner preference for new-follower notifications.
 *   • pet_shops.notify_on_follow — lets a shop owner mute "X followed your shop"
 *     notifications without touching the follow relationship itself.
 * Usage: node backend/scripts/migrate_shop_follow_notifications.js
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
    await client.query(`ALTER TABLE pet_shops ADD COLUMN IF NOT EXISTS notify_on_follow BOOLEAN NOT NULL DEFAULT true;`);
    console.log('✅ pet_shops.notify_on_follow added.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
