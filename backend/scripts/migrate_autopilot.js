/**
 * PetPluse — Migration: Autopilot (Phase 2)
 *
 * - vaccinations table (due-date tracking for proactive reminders/booking)
 * - users.autopilot_opt_in  (per-user opt-in to FULL auto-booking)
 * - appointments.reminder_sent_at (dedupe appointment reminders)
 *
 * Usage: node backend/scripts/migrate_autopilot.js
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
    console.log('⏳ Autopilot migration...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    await client.query(`
      CREATE TABLE IF NOT EXISTS vaccinations (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
        vaccine_name VARCHAR(120) NOT NULL,
        given_at DATE,
        due_at DATE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'due', -- due | reminded | booked | done
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vaccinations_due ON vaccinations (due_at) WHERE status IN ('due','reminded');`);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS autopilot_opt_in BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;`);

    console.log('✅ Autopilot migration complete (vaccinations, autopilot_opt_in, reminder_sent_at).');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
