/**
 * PetPluse — Migration: AI observability (Phase 3)
 * Adds ai_triages.tool_calls (JSONB) so every agent turn records which tools ran.
 * Usage: node backend/scripts/migrate_ai_observability.js
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
    console.log('⏳ AI observability migration...');
    await client.query(`ALTER TABLE ai_triages ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT '[]'::jsonb;`);
    console.log('✅ ai_triages.tool_calls added.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
migrate();
