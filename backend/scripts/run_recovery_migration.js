import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("❌ ERROR: Neither DATABASE_URL nor POSTGRES_URL was found in environment variables.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log('⏳ Running recovery and phone support migration...');
  const client = await pool.connect();
  try {
    const migrationPath = path.join(__dirname, '../src/migrations/add_phone_and_recovery_migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('⚡ Executing SQL statements on remote database...');
    await client.query(sql);
    console.log('✅ Migration executed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
