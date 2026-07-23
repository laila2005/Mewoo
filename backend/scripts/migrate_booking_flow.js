/**
 * PetPulse — Migration: server-orchestrated booking flow (hybrid)
 *  - ai_booking_sessions.user_id nullable  → guests get persisted sessions
 *    (multi-turn memory + flow state work without login)
 *  - ai_booking_sessions.flow_state JSONB  → booking wizard state
 * Usage: node backend/scripts/migrate_booking_flow.js
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
    console.log('⏳ Booking-flow migration...');
    await client.query(`ALTER TABLE ai_booking_sessions ALTER COLUMN user_id DROP NOT NULL;`);
    await client.query(`ALTER TABLE ai_booking_sessions ADD COLUMN IF NOT EXISTS flow_state JSONB;`);
    console.log('✅ user_id nullable + flow_state added.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
