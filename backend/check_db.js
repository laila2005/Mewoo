import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'petpulse_app',
  host: 'localhost',
  database: 'petpulse_db',
  password: 'secure_app_password_2026',
  port: 5432,
});

async function run() {
  try {
    const res = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'service_bookings'");
    console.log("COLUMNS:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
