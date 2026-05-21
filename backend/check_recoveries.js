import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = "postgresql://postgres.sffdyrgnqruvjmecvveu:JBY14pK2haHV4jIv@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

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
