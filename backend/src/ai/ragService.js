/**
 * PetPluse — RAG (Retrieval Augmented Generation) Service
 *
 * Vector search over the veterinary knowledge base, backed by pgvector in the
 * same PostgreSQL database the rest of the app uses (via config/db.js — no
 * separate Supabase client). Falls back to keyword search when vector search
 * is unavailable (missing extension, RPC, or embeddings).
 */

import { query } from '../config/db.js';
import { generateEmbedding } from './llmClient.js';

// Species detection so a "cat" question is never answered from a "dog" chunk
// (and vice versa). Short species words (cat/dog) must survive keyword filtering.
const SPECIES_WORDS = new Set(['cat', 'cats', 'dog', 'dogs']);
// COUNT mentions, not just presence: a cat entry may say "don't feed dog food"
// for contrast, so a boolean "mentions dog" would wrongly treat it as mixed and
// stop filtering it out of DOG queries. Compare which species dominates instead.
export function speciesScore(text = '') {
  const t = String(text).toLowerCase();
  const cat = (t.match(/\b(cats?|kittens?|felines?)\b/g) || []).length;
  const dog = (t.match(/\b(dogs?|pupp(?:y|ies)|canines?)\b/g) || []).length;
  return { cat, dog };
}
/**
 * True if a single-species query should NOT be answered from this chunk because
 * the OTHER species clearly dominates it.
 */
export function speciesMismatch(q, chunkText) {
  const qs = speciesScore(q), cs = speciesScore(chunkText);
  if (qs.cat > 0 && qs.dog === 0) return cs.dog > cs.cat;   // cat query, dog-dominant chunk
  if (qs.dog > 0 && qs.cat === 0) return cs.cat > cs.dog;   // dog query, cat-dominant chunk
  return false;
}

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
/**
 * Words that appear in almost every pet-care question and therefore say nothing
 * about the topic. Without this, "how often should I bathe my dog" ranked on
 * {often, should, dog} and returned the deworming entry.
 *
 * Species words are NOT here — cat/dog genuinely disambiguate an answer.
 */
const STOPWORDS = new Set([
  // question shape
  'what', 'when', 'where', 'which', 'whats', 'how', 'why', 'does', 'doesnt', 'do', 'dont',
  'should', 'shouldnt', 'could', 'would', 'will', 'wont', 'can', 'cant', 'is', 'are', 'was',
  'were', 'been', 'being', 'have', 'has', 'had', 'need', 'needs', 'want', 'wants', 'know',
  // filler
  'often', 'much', 'many', 'long', 'good', 'best', 'better', 'bad', 'fine', 'okay', 'right',
  'about', 'from', 'with', 'without', 'into', 'that', 'this', 'these', 'those', 'there',
  'here', 'then', 'than', 'they', 'them', 'their', 'your', 'yours', 'mine', 'ours', 'also',
  'just', 'very', 'really', 'some', 'any', 'anything', 'something', 'please', 'help', 'tell',
  'give', 'take', 'make', 'like', 'get', 'got', 'still', 'even', 'ever', 'more', 'most',
  // generic in this corpus specifically
  'pet', 'pets', 'animal', 'animals', 'owner', 'owners', 'time', 'times', 'day', 'days',
  'week', 'weeks', 'year', 'years', 'thing', 'things', 'info', 'information', 'advice',
  // Arabic equivalents
  'كيف', 'ماذا', 'متى', 'اين', 'أين', 'لماذا', 'هل', 'ما', 'من', 'الى', 'إلى', 'على',
  'عن', 'مع', 'هذا', 'هذه', 'ذلك', 'التي', 'الذي', 'يجب', 'ممكن', 'يمكن', 'أريد', 'اريد',
  'عايز', 'ازاي', 'إزاي', 'ايه', 'إيه', 'كام', 'حيوان', 'حيواني', 'معلومات', 'مساعدة',
]);

export async function fallbackTextSearch(q, topK = 5) {
  try {
    if (!q || typeof q !== 'string') return [];
    // Unicode-aware tokenizer: keep Latin words (>3 chars) AND non-Latin (e.g. Arabic)
    // words of 2+ chars, so bilingual queries produce usable keywords.
    const keywords = q
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      // Keep Latin words > 3 chars, any non-Latin word ≥ 2 chars (e.g. Arabic),
      // AND the short species words cat/dog which disambiguate the answer.
      .filter(w => w.length > 3 || (w.length >= 2 && w.charCodeAt(0) > 127) || SPECIES_WORDS.has(w))
      // Drop words that carry no topic. "how often SHOULD I bathe my dog" was
      // being answered from the deworming chunk on {often, should, dog}.
      .filter(w => !STOPWORDS.has(w));

    if (keywords.length === 0) return [];

    const patterns = keywords.map(k => `%${k}%`);

    // Pull ALL matching chunks, then rank in JS. Critical: the query has no
    // ORDER BY, so a tight LIMIT returned an ARBITRARY subset (heap order) — the
    // best-matching chunk could be excluded entirely, letting an inferior chunk
    // win by default (e.g. a cat-feeding question answered from a diabetes chunk).
    // The KB is small, so a generous cap safely covers every candidate.
    const CANDIDATE_LIMIT = 500;
    const { rows } = await query(
      `SELECT id, content, source, metadata
         FROM knowledge_chunks
        WHERE content ILIKE ANY($1)
        LIMIT $2`,
      [patterns, CANDIDATE_LIMIT]
    );

    const candidates = (rows || [])
      // Never surface a chunk about the other species for a single-species query.
      .filter(row => !speciesMismatch(q, String(row.content || '')));

    // ── Ranking ──────────────────────────────────────────────────────────────
    // This used to be a raw count of how many query words appeared anywhere in
    // the chunk, as a SUBSTRING. Two consequences, both reproduced:
    //   * "how often should I bathe my dog" scored the DEWORMING chunk highest
    //     on {often, should, dog} while the bathing chunks scored 1 and were cut
    //     by the minimum-match gate.
    //   * "cat" matched "medi-cat-ion", "indi-cat-e", "lo-cat-ion".
    // Now: stopwords are dropped, matching is on word boundaries, and a term is
    // worth more the RARER it is across the candidate set — so "bathe" outranks
    // "dog", which appears almost everywhere.
    const inChunk = (lc, k) =>
      new RegExp(`(^|[^\\p{L}\\p{N}])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(lc);

    const lowered = candidates.map(row => ({ row, lc: String(row.content || '').toLowerCase() }));
    // Document frequency over the candidates we actually have.
    const df = new Map(keywords.map(k => [k, lowered.filter(c => inChunk(c.lc, k)).length || 0]));
    const N = Math.max(1, lowered.length);
    const weightOf = (k) => Math.log(1 + N / Math.max(1, df.get(k) || 0));

    const scored = lowered.map(({ row, lc }) => {
      let score = 0, matches = 0;
      for (const k of keywords) {
        if (inChunk(lc, k)) { score += weightOf(k); matches += 1; }
      }
      // A term in the chunk's own heading is a strong topic signal.
      const heading = lc.split('\n')[0];
      for (const k of keywords) if (inChunk(heading, k)) score += weightOf(k) * 0.75;
      return { row, score, matches };
    });

    // Keep only chunks carrying real signal. The bar is a SHARE of the query's
    // total weight, not a word count, so one rare on-topic term can qualify a
    // chunk while three stopword-ish hits cannot.
    const totalWeight = keywords.reduce((sum, k) => sum + weightOf(k), 0) || 1;
    const MIN_SHARE = 0.35;
    const kept = scored
      .filter(s => s.matches > 0 && s.score / totalWeight >= MIN_SHARE)
      .sort((a, b) => b.score - a.score);

    // Deliberately NO "best partial match" rescue. Promoting a weak match meant
    // retrieval could never return nothing, so a genuine knowledge gap surfaced a
    // confident, unrelated chunk in the cited medical card — and the gap was
    // never logged. An honest miss is the more useful answer.
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
