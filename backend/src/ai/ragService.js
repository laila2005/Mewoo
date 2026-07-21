/**
 * PetPulse — RAG (Retrieval Augmented Generation) Service
 * 
 * Provides vector-based search over the veterinary knowledge base.
 * Uses pgvector for cosine similarity search on embeddings.
 */

import { supabaseAdmin } from '../config/supabase.js';
import { generateEmbedding } from './llmClient.js';

/**
 * Search the knowledge base for relevant chunks using vector similarity.
 * 
 * @param {string} query - The user's question or search query
 * @param {number} topK - Number of results to return (default: 5)
 * @param {number} threshold - Minimum similarity score (default: 0.3)
 * @returns {Promise<Array>} Ranked results with content, source, and similarity score
 */
export async function searchKnowledge(query, topK = 5, threshold = 0.3) {
  try {
    // 1. Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);

    if (!queryEmbedding || queryEmbedding.length === 0) {
      console.error('Failed to generate query embedding');
      return [];
    }

    // 2. Perform cosine similarity search via Supabase RPC
    // This requires a database function — we'll use raw SQL via .rpc()
    const { data, error } = await supabaseAdmin.rpc('search_knowledge_chunks', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: topK,
      match_threshold: threshold,
    });

    if (error) {
      // Fallback: try raw SQL if the RPC function doesn't exist yet
      console.warn('RPC search_knowledge_chunks not found, using fallback text search:', error.message);
      return await fallbackTextSearch(query, topK);
    }

    return (data || []).map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: row.similarity,
    }));
  } catch (err) {
    console.error('Knowledge search error:', err.message);
    // Final fallback: basic text search
    return await fallbackTextSearch(query, topK);
  }
}

/**
 * Fallback text search when vector search is unavailable.
 * Uses simple ILIKE pattern matching on content.
 */
async function fallbackTextSearch(query, topK = 5) {
  try {
    // Extract keywords from the query
    const keywords = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Only meaningful words

    if (keywords.length === 0) return [];

    // Build an OR query for each keyword
    const searchPattern = keywords.map(k => `%${k}%`);

    const { data, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('id, content, source, metadata')
      .or(searchPattern.map(p => `content.ilike.${p}`).join(','))
      .limit(topK);

    if (error) {
      console.error('Fallback text search error:', error.message);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      content: row.content,
      source: row.source,
      metadata: row.metadata,
      similarity: 0.5, // Approximate score for text search
    }));
  } catch (err) {
    console.error('Fallback search failed:', err.message);
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

  const { data, error } = await supabaseAdmin
    .from('knowledge_chunks')
    .insert({
      content,
      source,
      metadata,
      embedding: JSON.stringify(embedding),
    })
    .select('id, source, created_at')
    .single();

  if (error) {
    throw new Error(`Failed to ingest chunk: ${error.message}`);
  }

  return data;
}

export default { searchKnowledge, ingestChunk };
