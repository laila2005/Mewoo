import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'petpluse_app',
  host: 'localhost',
  database: 'petpluse_db',
  password: 'secure_app_password_2026',
  port: 5432,
});

async function run() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("TABLES:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
