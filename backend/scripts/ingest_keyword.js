/**
 * PetPulse — Keyword-only knowledge ingest (no embeddings required).
 *
 * Inserts markdown sections into knowledge_chunks with embedding=NULL. These rows
 * are invisible to the vector RPC but fully searchable via ragService's ILIKE
 * keyword fallback — which is the path prod actually uses (Vercel can't reach an
 * Ollama embed server). Idempotent per source (deletes that source's rows first).
 *
 * Usage: node scripts/ingest_keyword.js [path/to/file.md] [source_name]
 *        defaults to docs/egypt_pet_care.md
 */
import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'egypt_pet_care.md');
const source = process.argv[3] || path.basename(filePath);

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new pg.Pool({ connectionString, ssl: isLocal ? false : { rejectUnauthorized: false } });

/** Split markdown into level-2 (##) sections; keep the heading text in the chunk. */
function chunkMarkdown(md) {
  return md
    .split(/\n(?=## )/g)
    .map(s => s.trim())
    .filter(p => p.startsWith('## '))
    .map(p => p.replace(/^##\s+/, ''))
    .filter(p => p.length > 50);
}

async function run() {
  const md = fs.readFileSync(filePath, 'utf8');
  const chunks = chunkMarkdown(md);
  if (chunks.length === 0) { console.error('❌ No chunks parsed from', filePath); process.exit(1); }

  const client = await pool.connect();
  try {
    console.log(`⏳ Ingesting ${chunks.length} chunks from ${path.basename(filePath)} (source='${source}', keyword-only)...`);
    await client.query('DELETE FROM knowledge_chunks WHERE source = $1', [source]);
    for (const c of chunks) {
      await client.query(
        'INSERT INTO knowledge_chunks (content, source, metadata, embedding) VALUES ($1, $2, $3::jsonb, NULL)',
        [c, source, JSON.stringify({ ingest: 'keyword' })]
      );
    }
    const { rows } = await client.query('SELECT COUNT(*)::int AS n FROM knowledge_chunks WHERE source = $1', [source]);
    console.log(`✅ Done. ${rows[0].n} chunks stored for source='${source}' (searchable via keyword fallback).`);
  } catch (e) {
    console.error('❌ Ingest failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
