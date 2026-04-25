import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// Connect to the PostgreSQL instance running via Docker Compose
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'petpulse_admin',
  password: process.env.POSTGRES_PASSWORD || 'petpulse_password123',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'petpulse_db',
  // Max connections in the pool
  max: 20, 
  // How long a client is allowed to remain idle before being closed
  idleTimeoutMillis: 30000, 
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('Executed query', { text, duration, rows: res.rowCount });
  return res;
};

export const getClient = () => {
  return pool.connect();
};
