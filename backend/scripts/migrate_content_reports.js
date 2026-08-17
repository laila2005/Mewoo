/**
 * PetPluse — user-submitted content reports.
 *
 * There was no reports, flags or moderation table anywhere in the schema.
 * Admins had an audit log of what staff did, but no inbox for what customers
 * saw. A customer who found a fraudulent shop had nowhere to say so.
 *
 * Built generically on purpose: shops need it first, but products, community
 * posts and lost-and-found listings get reporting for free afterwards rather
 * than growing three near-identical tables.
 *
 * target_id is TEXT, not UUID: marketplace_products.id is a varchar while
 * pet_shops.id is a uuid, and a single reports table has to hold both.
 *
 * Usage:  node scripts/migrate_content_reports.js
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const run = async () => {
  await client.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_reports (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        target_type     VARCHAR(32)  NOT NULL,
        target_id       TEXT         NOT NULL,
        target_label    TEXT,
        reporter_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason          VARCHAR(48)  NOT NULL,
        details         TEXT,
        status          VARCHAR(16)  NOT NULL DEFAULT 'open',
        reviewed_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
        reviewed_at     TIMESTAMPTZ,
        resolution_note TEXT,
        created_at      TIMESTAMPTZ  DEFAULT NOW()
      )`);
    console.log('✅ content_reports');

    // The admin queue reads open reports newest-first; the target index backs
    // "has this shop been reported before?".
    await client.query(`CREATE INDEX IF NOT EXISTS content_reports_status_idx ON content_reports (status, created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS content_reports_target_idx ON content_reports (target_type, target_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS content_reports_reporter_idx ON content_reports (reporter_id, created_at DESC)`);

    // One OPEN report per person per target. Without this, an unguarded report
    // button is a tool for burying a competitor under duplicate reports — the
    // partial index still lets the same person report again after a decision.
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS content_reports_one_open_per_reporter
        ON content_reports (target_type, target_id, reporter_id)
        WHERE status = 'open'`);
    console.log('✅ indexes, including one-open-report-per-person');

    await client.query(`
      ALTER TABLE content_reports
        DROP CONSTRAINT IF EXISTS content_reports_status_check`);
    await client.query(`
      ALTER TABLE content_reports
        ADD CONSTRAINT content_reports_status_check
        CHECK (status IN ('open', 'resolved', 'dismissed'))`);
    console.log('✅ status constraint');

    await client.query('COMMIT');
    console.log('\n🎉 content reports migration complete');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ migration rolled back:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
