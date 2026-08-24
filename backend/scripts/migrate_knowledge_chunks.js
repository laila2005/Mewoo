import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isLocal = connectionString ? (connectionString.includes('localhost') || connectionString.includes('127.0.0.1')) : true;

const pool = connectionString
  ? new pg.Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false }
    })
  : new pg.Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'medfylolo',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: process.env.DB_NAME || 'petpluse_db'
    });

async function migrateKnowledgeChunks() {
  const client = await pool.connect();
  try {
    console.log("⏳ Running knowledge_chunks table migration...");

    console.log("⚡ Step 1: Ensuring uuid and vector extensions...");
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');

    console.log("⚡ Step 2: Creating knowledge_chunks table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_chunks (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          content TEXT NOT NULL,
          embedding vector(768),
          source TEXT NOT NULL,
          metadata JSONB DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Migration completed successfully: knowledge_chunks table created/verified.");
  } catch (error) {
    console.error("❌ Error migrating knowledge_chunks table:", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateKnowledgeChunks();
