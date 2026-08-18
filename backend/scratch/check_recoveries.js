import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// F-10: the production connection string was hard-coded here in clear text,
// committed to a public repository, and it carried the postgres SUPER-USER
// role. It is now read from the environment like every other secret, and the
// script refuses to run rather than falling back to anything embedded.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set. Copy backend/.env.example to .env and set it.');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  try {
    console.log('Fetching latest 5 entries from password_recoveries...');
    const res = await pool.query(
      `SELECT r.id, r.user_id, u.email, u.phone, r.verification_type, r.recipient, r.otp_code_hash, r.reset_token_hash, r.created_at, r.expires_at 
       FROM password_recoveries r
       JOIN users u ON r.user_id = u.id
       ORDER BY r.created_at DESC LIMIT 5`
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Database query error:', err.message);
  } finally {
    await pool.end();
  }
}

run();
