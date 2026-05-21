import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

// Connect dynamically via connection string (for cloud databases like Supabase/Neon/Render) or fallback to parameters
// In serverless environments (like Vercel), hot starts import the file again.
// To prevent connection leaks, we store the pool instance on the global object.
if (!global._pgPool) {
  // Note: For serverless platforms (like Vercel), it is highly recommended to use the 
  // Supabase Transaction Mode Pooler on Port 6543 (instead of port 5432 session mode).
  // This allows Supavisor to multiplex active connections and prevents EMAXCONNSESSION errors.
  const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
  global._pgPool = connectionString
    ? new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false // Required for most hosted database providers like Neon, Render, Supabase
        },
        // Under serverless environments, each container handles 1 concurrent request.
        // Restricting the pool size per container prevents exhausting Supabase session/client limits.
        max: isProd ? 1 : 5,
        idleTimeoutMillis: isProd ? 10000 : 30000, // Shorten idle timeout to free up connections quickly
      })
    : new Pool({
        user: process.env.POSTGRES_USER || 'petpulse_admin',
        password: process.env.POSTGRES_PASSWORD || 'petpulse_password123',
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || 5432,
        database: process.env.POSTGRES_DB || 'petpulse_db',
        // Max connections in the pool
        max: 5, 
        // How long a client is allowed to remain idle before being closed
        idleTimeoutMillis: 30000, 
      });
}

const pool = global._pgPool;

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

export const query = async (text, params) => {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // Story 5: Only log query text in development. Never log in production
  // to prevent SQL/schema exposure through log aggregators.
  if (process.env.NODE_ENV === 'development') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  } else {
    console.log('Executed query', { duration, rows: res.rowCount });
  }
  return res;
};

export const getClient = () => {
  return pool.connect();
};
