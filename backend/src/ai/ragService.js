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

/**
 * Search the knowledge base for relevant chunks using vector similarity.
 *
 * @param {string} q - The user's question or search query
 * @param {number} topK - Number of results to return (default: 5)
 * @param {number} threshold - Minimum similarity score (default: 0.3)
 * @returns {Promise<Array>} Ranked results with content, source, and similarity score
 */
export async function searchKnowledge(q, topK = 5, threshold = 0.3) {
  try {
    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(q);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.warn('RAG: empty query embedding — using keyword fallback.');
      return await fallbackTextSearch(q, topK);
    }

    // 2. Cosine similarity search via the search_knowledge_chunks() SQL function.
    //    The function casts the JSON-encoded vector with ::vector internally.
    const { rows } = await query(
      'SELECT id, content, source, metadata, similarity FROM search_knowledge_chunks($1, $2, $3)',
      [JSON.stringify(queryEmbedding), topK, threshold]
    );

    return (rows || []).map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
  } catch (err) {
    // Missing RPC / vector extension / connection issue — degrade gracefully.
    console.warn('RAG vector search unavailable, using keyword fallback:', err.message);
    return await fallbackTextSearch(q, topK);
  }
}

/**
 * Fallback keyword search when vector search is unavailable.
 * Uses ILIKE pattern matching on content.
 */
async function fallbackTextSearch(q, topK = 5) {
  try {
    const keywords = q
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3);

    if (keywords.length === 0) return [];

    const patterns = keywords.map(k => `%${k}%`);

    // content ILIKE ANY($1) matches any keyword pattern.
    const { rows } = await query(
      `SELECT id, content, source, metadata
         FROM knowledge_chunks
        WHERE content ILIKE ANY($1)
        LIMIT $2`,
      [patterns, topK]
    );

    return (rows || []).map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: 0.5, // approximate score for keyword matches
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
