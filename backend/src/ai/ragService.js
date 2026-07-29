/**
 * PetPulse — RAG (Retrieval Augmented Generation) Service
 *
 * Vector search over the veterinary knowledge base, backed by pgvector in the
 * same PostgreSQL database the rest of the app uses (via config/db.js — no
 * separate Supabase client). Falls back to keyword search when vector search
 * is unavailable (missing extension, RPC, or embeddings).
 */

import { query } from '../config/db.js';
import { generateEmbedding } from './llmClient.js';

// In-memory cache for repeated questions (common Q&A) — avoids re-embedding and
// re-querying the same question. TTL-bounded + capped; only non-empty results
// are cached so a transient outage doesn't stick.
const _ragCache = new Map(); // key -> { at, results }
const RAG_TTL_MS = 10 * 60 * 1000;
const RAG_CACHE_MAX = 300;

function ragCacheGet(key) {
  const e = _ragCache.get(key);
  if (!e) return null;
  if (Date.now() - e.at > RAG_TTL_MS) { _ragCache.delete(key); return null; }
  return e.results;
}
function ragCacheSet(key, results) {
  if (!Array.isArray(results) || results.length === 0) return;
  if (_ragCache.size >= RAG_CACHE_MAX) { _ragCache.delete(_ragCache.keys().next().value); }
  _ragCache.set(key, { at: Date.now(), results });
}

/**
 * Search the knowledge base for relevant chunks using vector similarity.
 *
 * @param {string} q - The user's question or search query
 * @param {number} topK - Number of results to return (default: 5)
 * @param {number} threshold - Minimum similarity score (default: 0.3)
 * @returns {Promise<Array>} Ranked results with content, source, and similarity score
 */
export async function searchKnowledge(q, topK = 5, threshold = 0.3) {
  if (!q || typeof q !== 'string' || !q.trim()) return [];
  const cacheKey = `${q.trim().toLowerCase()}|${topK}|${threshold}`;
  const cached = ragCacheGet(cacheKey);
  if (cached) return cached;
  try {
    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(q);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn('RAG: empty query embedding — using keyword fallback.');
      const fb = await fallbackTextSearch(q, topK);
      ragCacheSet(cacheKey, fb);
      return fb;
    }

    // 2. Cosine similarity search via the search_knowledge_chunks() SQL function.
    //    The function casts the JSON-encoded vector with ::vector internally.
    const { rows } = await query(
      'SELECT id, content, source, metadata, similarity FROM search_knowledge_chunks($1, $2, $3)',
      [JSON.stringify(queryEmbedding), topK, threshold]
    );

    const results = (rows || []).map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
    ragCacheSet(cacheKey, results);
    return results;
  } catch (err) {
    // Missing RPC / vector extension / connection issue — degrade gracefully.
    console.warn('RAG vector search unavailable, using keyword fallback:', err.message);
    const fb = await fallbackTextSearch(q, topK);
    ragCacheSet(cacheKey, fb);
    return fb;
  }
}

/**
 * Fallback keyword search when vector search is unavailable.
 * Uses ILIKE pattern matching on content.
 */
async function fallbackTextSearch(q, topK = 5) {
  try {
    if (!q || typeof q !== 'string') return [];
    const keywords = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (keywords.length === 0) return [];

    const patterns = keywords.map(k => `%${k}%`);

    // Pull a wider candidate set, then rank in JS by how many DISTINCT query
    // keywords each chunk contains and gate on a minimum match count — so a single
    // incidental word (e.g. "chocolate" as a coat colour) isn't served as guidance.
    const CANDIDATE_LIMIT = Math.min(50, Math.max(topK * 5, topK));
    const { rows } = await query(
      `SELECT id, content, source, metadata
         FROM knowledge_chunks
        WHERE content ILIKE ANY($1)
        LIMIT $2`,
      [patterns, CANDIDATE_LIMIT]
    );

    const scored = (rows || []).map(row => {
      const lc = String(row.content || '').toLowerCase();
      const matches = keywords.reduce((n, k) => n + (lc.includes(k) ? 1 : 0), 0);
      return { row, matches };
    });
    const minMatches = keywords.length >= 2 ? 2 : 1;
    let kept = scored.filter(s => s.matches >= minMatches).sort((a, b) => b.matches - a.matches);
    if (kept.length === 0 && scored.length) {
      // Nothing cleared the bar — fall back to the single best partial match only.
      kept = [scored.sort((a, b) => b.matches - a.matches)[0]];
    }
    return kept.slice(0, topK).map(({ row }) => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: null,      // keyword match — never present a fabricated confidence
      match_type: 'keyword',
    }));
  } catch (err) {
    console.error('RAG keyword fallback failed:', err.message);
    return [];
  }
}

/**
 * Ingest a chunk into the knowledge base with its embedding.
 *
 * @param {string} content - The text content
 * @param {string} source - Source identifier (e.g., 'vet_knowledge_base.md')
 * @param {Object} metadata - Additional metadata (page, section, etc.)
 * @returns {Promise<Object>} The inserted row
 */
export async function ingestChunk(content, source, metadata = {}) {
  const embedding = await generateEmbedding(content);

  const { rows } = await query(
    `INSERT INTO knowledge_chunks (content, source, metadata, embedding)
     VALUES ($1, $2, $3, $4::vector)
     RETURNING id, source, created_at`,
    [content, source, metadata, JSON.stringify(embedding)]
  );

  return rows[0];
}

export default { searchKnowledge, ingestChunk };
