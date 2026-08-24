/**
 * PetPluse — (re)embed the knowledge base with the configured hosted provider.
 *
 * Run ONCE after enabling hosted embeddings (set EMBEDDINGS_URL / EMBEDDINGS_KEY /
 * EMBEDDINGS_MODEL in the environment). Backfills real vectors into
 * knowledge_chunks.embedding so ragService's vector search activates; until then
 * the app safely uses keyword search.
 *
 * IMPORTANT: use a 768-dim embedding model (e.g. jina-embeddings-v2-base-en) to
 * match the vector(768) column. A different dimension needs a column migration.
 *
 * Usage: node backend/scripts/reembed_kb.js [--only-missing]
 */
import pg from 'pg';
import dotenv from 'dotenv';
import { generateEmbedding } from '../src/ai/llmClient.js';
dotenv.config();

const onlyMissing = process.argv.includes('--only-missing');
const cs = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!cs) { console.error('❌ Missing DATABASE_URL'); process.exit(1); }
if (!process.env.EMBEDDINGS_URL) {
  console.error('❌ EMBEDDINGS_URL is not set — configure a hosted embeddings provider first.');
  process.exit(1);
}
const pool = new pg.Pool({ connectionString: cs, ssl: cs.includes('localhost') ? false : { rejectUnauthorized: false } });

async function run() {
  const client = await pool.connect();
  try {
    const where = onlyMissing ? 'WHERE embedding IS NULL' : '';
    const { rows } = await client.query(`SELECT id, content FROM knowledge_chunks ${where} ORDER BY created_at ASC`);
    console.log(`⏳ Embedding ${rows.length} chunk(s) via ${process.env.EMBEDDINGS_MODEL || '(default model)'}…`);
    let ok = 0, fail = 0, dim = null;
    for (const r of rows) {
      try {
        const vec = await generateEmbedding(r.content);
        if (!Array.isArray(vec) || vec.length === 0) throw new Error('empty vector');
        if (dim === null) { dim = vec.length; console.log(`   model returns ${dim}-dim vectors`); }
        await client.query('UPDATE knowledge_chunks SET embedding = $1::vector WHERE id = $2', [JSON.stringify(vec), r.id]);
        ok++;
      } catch (e) {
        fail++;
        console.warn(`   ✗ chunk ${r.id}: ${e.message}`);
      }
    }
    console.log(`✅ Done. Embedded ${ok}, failed ${fail}.`);
    if (dim && dim !== 768) {
      console.warn(`⚠️  Model dim is ${dim}, but knowledge_chunks.embedding is vector(768). Alter the column + search RPC to ${dim} dims, or use a 768-dim model.`);
    }
  } catch (e) {
    console.error('❌ Re-embed failed:', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}
run();
