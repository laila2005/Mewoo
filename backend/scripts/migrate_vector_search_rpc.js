/**
 * PetPluse — Migration: Create search_knowledge_chunks RPC function
 * 
 * Creates a PostgreSQL function for pgvector cosine similarity search.
 * This is called by the RAG service via Supabase's .rpc() method.
 * 
 * Usage: node backend/scripts/migrate_vector_search_rpc.js
 */

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.includes('supabase')
    ? { rejectUnauthorized: false }
    : false,
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Creating search_knowledge_chunks RPC function...');

    await client.query(`
      CREATE OR REPLACE FUNCTION search_knowledge_chunks(
        query_embedding text,
        match_count int DEFAULT 5,
        match_threshold float DEFAULT 0.3
      )
      RETURNS TABLE (
        id uuid,
        content text,
        source text,
        metadata jsonb,
        similarity float
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT
          kc.id,
          kc.content,
          kc.source,
          kc.metadata,
          1 - (kc.embedding <=> query_embedding::vector) AS similarity
        FROM knowledge_chunks kc
        WHERE kc.embedding IS NOT NULL
          AND 1 - (kc.embedding <=> query_embedding::vector) > match_threshold
        ORDER BY kc.embedding <=> query_embedding::vector
        LIMIT match_count;
      END;
      $$;
    `);

    console.log('✅ search_knowledge_chunks function created successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
