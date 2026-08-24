/**
 * PetPluse — Knowledge Base Ingestion Script
 *
 * Reads the vet knowledge base markdown file, chunks it into sections,
 * generates embeddings via Ollama, and inserts into the knowledge_chunks table
 * using the shared PostgreSQL database (pg + DATABASE_URL) — no Supabase client.
 *
 * Usage: node backend/scripts/ingest.js
 * Requires: DATABASE_URL in backend/.env, and Ollama running with nomic-embed-text.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Configuration ──────────────────────────────
const KNOWLEDGE_BASE_PATH = path.resolve(__dirname, '../../docs/vet_knowledge_base.md');
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://127.0.0.1:11434';
const SOURCE_NAME = 'vet_knowledge_base.md';

// ─── Postgres pool (same DB as the app) ─────────
const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('❌ Missing DATABASE_URL in backend/.env');
  process.exit(1);
}
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 2,
});

// ─── Chunking Logic ─────────────────────────────
/** Split markdown into chunks by section headings (## or ###). */
function chunkMarkdown(markdown) {
  const lines = markdown.split('\n');
  const chunks = [];
  let currentChunk = { heading: '', content: [], metadata: {} };

  for (const line of lines) {
    const headingMatch = line.match(/^(#{2,3})\s+(.+)/);
    if (headingMatch) {
      if (currentChunk.content.length > 0) {
        const text = currentChunk.content.join('\n').trim();
        if (text.length > 50) {
          chunks.push({ content: `${currentChunk.heading}\n\n${text}`, metadata: { ...currentChunk.metadata } });
        }
      }
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();
      currentChunk = { heading: `${'#'.repeat(level)} ${heading}`, content: [], metadata: { section: heading, level } };
    } else {
      currentChunk.content.push(line);
    }
  }
  if (currentChunk.content.length > 0) {
    const text = currentChunk.content.join('\n').trim();
    if (text.length > 50) {
      chunks.push({ content: `${currentChunk.heading}\n\n${text}`, metadata: { ...currentChunk.metadata } });
    }
  }
  return chunks;
}

// ─── Embedding Generation (Ollama) ──────────────
async function generateEmbedding(text) {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
    });
    if (!response.ok) throw new Error(`Ollama error ${response.status}: ${await response.text()}`);
    const result = await response.json();
    return result.embeddings[0];
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      throw new Error('Cannot connect to Ollama. Make sure it is running: ollama serve');
    }
    throw err;
  }
}

// ─── Main Ingestion Pipeline ────────────────────
async function ingest() {
  console.log('🚀 PetPluse Knowledge Base Ingestion');
  console.log('─'.repeat(50));

  if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
    console.error(`❌ File not found: ${KNOWLEDGE_BASE_PATH}`);
    process.exit(1);
  }
  const markdown = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
  console.log(`📄 Read ${markdown.length} characters from ${SOURCE_NAME}`);

  const chunks = chunkMarkdown(markdown);
  console.log(`✂️  Split into ${chunks.length} chunks`);

  console.log(`\n🤖 Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`📡 Ollama URL: ${OLLAMA_BASE}`);
  try {
    await generateEmbedding('test');
    console.log('✅ Ollama connection OK\n');
  } catch (err) {
    console.error(`❌ Ollama connection failed: ${err.message}`);
    console.error('\n💡 Make sure Ollama is running and the model is pulled:');
    console.error('   ollama serve');
    console.error(`   ollama pull ${EMBEDDING_MODEL}`);
    process.exit(1);
  }

  const client = await pool.connect();
  let successCount = 0;
  let failCount = 0;
  try {
    // Clear existing chunks from this source (idempotent re-ingestion)
    try {
      const del = await client.query('DELETE FROM knowledge_chunks WHERE source = $1', [SOURCE_NAME]);
      console.log(`🗑️  Cleared ${del.rowCount} old chunk(s) from this source`);
    } catch (e) {
      console.warn(`⚠️  Could not clear old chunks: ${e.message}`);
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = `[${i + 1}/${chunks.length}]`;
      try {
        const embedding = await generateEmbedding(chunk.content);
        await client.query(
          `INSERT INTO knowledge_chunks (content, source, metadata, embedding)
           VALUES ($1, $2, $3, $4::vector)`,
          [chunk.content, SOURCE_NAME, chunk.metadata, JSON.stringify(embedding)]
        );
        console.log(`  ${progress} ✅ ${(chunk.metadata.section || 'Unknown').substring(0, 60)}`);
        successCount++;
      } catch (err) {
        console.error(`  ${progress} ❌ Failed: ${err.message}`);
        failCount++;
      }
      if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 100));
    }

    console.log('\n' + '─'.repeat(50));
    console.log('✅ Ingestion complete!');
    console.log(`   Inserted: ${successCount} chunks`);
    console.log(`   Failed:   ${failCount} chunks`);
    console.log(`   Source:   ${SOURCE_NAME}`);

    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM knowledge_chunks WHERE source = $1', [SOURCE_NAME]);
    console.log(`   DB total: ${rows[0].n} chunks`);
  } finally {
    client.release();
    await pool.end();
  }
}

ingest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
