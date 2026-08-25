/**
 * PetPulse — Training Programs (Trainer Phases 2-4).
 *   • training_programs   — a trainer's offerings. `capacity` NULL means 1:1
 *     (Phase 2); a number turns the same row into a group class (Phase 4).
 *   • program_enrollments — one pet's enrollment. status='waitlisted' when a
 *     group class is full, promoted to 'active' automatically as seats free up.
 *   • enrollment_progress_notes — trainer-authored notes visible to the pet's
 *     owner (Phase 3), append-only so history is never silently edited away.
 * Usage: node backend/scripts/migrate_training_programs.js
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
      CREATE TABLE IF NOT EXISTS training_programs (
        id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trainer_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title            varchar(150) NOT NULL,
        description      text,
        sessions_count   int,
        duration_weeks   int,
        price            numeric NOT NULL CHECK (price >= 0),
        capacity         int CHECK (capacity IS NULL OR capacity > 0),
        status           varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
        created_at       timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ training_programs table ready.');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_training_programs_trainer ON training_programs (trainer_id, status);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_enrollments (
        id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        program_id   uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
        owner_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        pet_id       uuid REFERENCES pets(id) ON DELETE SET NULL,
        status       varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'waitlisted', 'completed', 'cancelled')),
        enrolled_at  timestamptz NOT NULL DEFAULT now(),
        UNIQUE (program_id, owner_id, pet_id)
      );
    `);
    console.log('✅ program_enrollments table ready.');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_program_enrollments_program ON program_enrollments (program_id, status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_program_enrollments_owner ON program_enrollments (owner_id);`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS enrollment_progress_notes (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        enrollment_id  uuid NOT NULL REFERENCES program_enrollments(id) ON DELETE CASCADE,
        note           text NOT NULL,
        created_at     timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log('✅ enrollment_progress_notes table ready.');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_progress_notes_enrollment ON enrollment_progress_notes (enrollment_id, created_at DESC);`);
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
