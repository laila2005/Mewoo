/**
 * PetPluse — Enable Row Level Security on every public table.
 *
 * Supabase Advisor flagged all 57 public tables as CRITICAL: "RLS Disabled
 * in Public". The app itself connects to Postgres as the `postgres` role
 * (see backend/.env DATABASE_URL), which owns every one of these tables and
 * has rolbypassrls=true — so enabling RLS has ZERO effect on the app's own
 * queries. What it actually closes is Supabase's auto-generated PostgREST
 * Data API (https://<project>.supabase.co/rest/v1/<table>), which the
 * `anon` and `authenticated` roles can call directly with just the anon key.
 * With RLS off, that API currently has unrestricted read/write access to
 * every row in every table, including payments, medical_records, and users
 * — completely bypassing this app's own auth. With RLS on and no policies
 * defined, those roles see zero rows by default (Postgres RLS is deny-all
 * until a policy grants access), fully closing the gap.
 *
 * The app doesn't currently use the Supabase JS client for any live request
 * path (confirmed: only two dead functions in userSupabaseService.js import
 * it, and nothing calls them), so there is no policy work needed to keep
 * existing functionality working — this is a pure hardening step.
 *
 * Usage:  node scripts/enable_rls_all_tables.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { query } from '../src/config/db.js';

async function main() {
  const tablesRes = await query(`
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
    ORDER BY c.relname
  `);
  const tables = tablesRes.rows.map((r) => r.table_name);
  console.log(`Enabling RLS on ${tables.length} tables...`);

  for (const table of tables) {
    // Table names come from pg_class, not user input — safe to interpolate,
    // and quoted in case any name needs it.
    await query(`ALTER TABLE public."${table}" ENABLE ROW LEVEL SECURITY`);
    console.log(`  ✅ ${table}`);
  }

  const verify = await query(`
    SELECT count(*)::int AS n
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = false
  `);
  console.log(`\nRemaining tables without RLS: ${verify.rows[0].n}`);
  process.exit(verify.rows[0].n === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Failed:', e);
  process.exit(1);
});
