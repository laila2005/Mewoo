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
  console.error("❌ ERROR: DATABASE_URL not found.");
  process.exit(1);
}

const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');

const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  console.log("⏳ Connecting to the remote database...");
  try {
    const sqlPath = path.join(__dirname, '../src/migrations/add_medical_records.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("⚡ Running migration: add_medical_records.sql");
    await pool.query(sql);
    console.log("✅ Migration completed successfully. medical_records table created.");
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
