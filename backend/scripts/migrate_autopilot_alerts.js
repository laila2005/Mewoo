/**
 * PetPluse — Migration: Autopilot alerts (Phase 3 extras)
 * found_reports.autopilot_notified — dedupe proximity match alerts.
 * Usage: node backend/scripts/migrate_autopilot_alerts.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('⏳ Autopilot alerts migration...');
    await client.query(`ALTER TABLE found_reports ADD COLUMN IF NOT EXISTS autopilot_notified BOOLEAN DEFAULT FALSE;`);
    console.log('✅ found_reports.autopilot_notified added.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
