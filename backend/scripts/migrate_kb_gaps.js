/**
 * PetPluse — Migration: knowledge-base gap log.
 * Records health questions VetAI could NOT answer from the knowledge base, so
 * admins can see what content to author next (a self-improving KB loop).
 * Usage: node backend/scripts/migrate_kb_gaps.js
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
      CREATE TABLE IF NOT EXISTS ai_kb_gaps (
        id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        question   text NOT NULL,
        lang       text,
        user_id    uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ ai_kb_gaps table ready.');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_kb_gaps_created ON ai_kb_gaps (created_at DESC);`);
    console.log('✅ index idx_kb_gaps_created ready.');
  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
