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
    const res = await pool.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = 'booking_status'");
    console.log("BOOKING STATUS ENUM:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
