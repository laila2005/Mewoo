/**
 * PetPulse — Security remediation item #3: limited-privilege database role.
 *
 * The application currently connects as `postgres`, which on this Supabase
 * project owns the public schema and can DROP/ALTER anything in it. A future
 * credential leak of that connection string would again mean full database
 * control, not just data access. This creates a role scoped to exactly what
 * the app does at runtime — read/write on existing and future tables and
 * sequences in `public` — with no DROP, no schema modification, no
 * CREATEDB/CREATEROLE, and no superuser.
 *
 * This does NOT switch the application over to the new role. That's a
 * deliberate, separate step (update DATABASE_URL in Vercel and redeploy)
 * requiring account access this script doesn't have — creating the role is
 * safe and reversible on its own; repointing the live app is not something to
 * do silently from a maintenance script.
 *
 * Usage: node backend/scripts/create_limited_privilege_role.js
 */
import pg from 'pg';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

const ROLE_NAME = 'petpulse_app';
// Alphanumeric only — safe to drop straight into a connection string with no
// URL-encoding to get wrong.
const PASSWORD = crypto.randomBytes(24).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 32);

async function run() {
  const client = await pool.connect();
  try {
    const existing = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [ROLE_NAME]);
    if (existing.rows.length > 0) {
      console.log(`ℹ️  Role "${ROLE_NAME}" already exists — resetting its password so this stays idempotent.`);
      await client.query(`ALTER ROLE ${ROLE_NAME} WITH LOGIN PASSWORD '${PASSWORD}'`);
    } else {
      await client.query(`CREATE ROLE ${ROLE_NAME} WITH LOGIN PASSWORD '${PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION`);
      console.log(`✅ Role "${ROLE_NAME}" created.`);
    }

    // Connect privilege + visibility into the schema (not ownership).
    await client.query(`GRANT CONNECT ON DATABASE postgres TO ${ROLE_NAME}`);
    await client.query(`GRANT USAGE ON SCHEMA public TO ${ROLE_NAME}`);

    // Data access on every table/sequence that exists right now.
    await client.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${ROLE_NAME}`);
    await client.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${ROLE_NAME}`);

    // Same, automatically, for tables/sequences created later by migrations
    // (which run as `postgres`) — so this role doesn't silently fall behind
    // schema changes and start throwing permission errors.
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${ROLE_NAME}`);
    await client.query(`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${ROLE_NAME}`);

    console.log('✅ Granted SELECT/INSERT/UPDATE/DELETE on all current + future tables and sequences in public.');
    console.log('✅ No DROP, ALTER, CREATE, CREATEDB, CREATEROLE, or superuser granted.');

    // Build the connection string the same way the existing DATABASE_URL is
    // shaped, swapping only user/password, so it's a drop-in replacement.
    // Supabase's pooler routes by tenant using a "<role>.<project-ref>"
    // username — a bare role name fails with "no tenant identifier provided"
    // even though a direct (non-pooler) connection would accept it. Preserve
    // whatever suffix the existing DATABASE_URL's username already has.
    const url = new URL(connectionString);
    const existingUser = url.username;
    const dotIndex = existingUser.indexOf('.');
    const projectSuffix = dotIndex === -1 ? '' : existingUser.slice(dotIndex);
    url.username = ROLE_NAME + projectSuffix;
    url.password = PASSWORD;

    console.log('\n──────────────────────────────────────────────────────────');
    console.log('New limited-privilege connection string (save this now — the');
    console.log('password is not stored anywhere and this script will not print it again):');
    console.log(url.toString());
    console.log('──────────────────────────────────────────────────────────');
    console.log('\nThis is NOT yet wired into the app. To switch over:');
    console.log('  1. Update DATABASE_URL in Vercel with the string above.');
    console.log('  2. Update your local .env the same way if you want dev to match.');
    console.log('  3. Redeploy, then confirm the app still works end-to-end.');
    console.log('  4. Only after that, consider revoking postgres-level app access if desired.');
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
