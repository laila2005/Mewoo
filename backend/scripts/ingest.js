/**
 * PetPulse — Knowledge Base Ingestion Script
 * 
 * Reads the vet knowledge base markdown file, chunks it into sections,
 * generates embeddings via Ollama, and inserts into the knowledge_chunks table.
 * 
 * Usage: node backend/scripts/ingest.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ─── Configuration ──────────────────────────────
const KNOWLEDGE_BASE_PATH = path.resolve(__dirname, '../../docs/vet_knowledge_base.md');
const EMBEDDING_MODEL = 'nomic-embed-text';
const OLLAMA_BASE = process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://127.0.0.1:11434';
const SOURCE_NAME = 'vet_knowledge_base.md';

// ─── Supabase Client ────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Chunking Logic ─────────────────────────────
/**
 * Split markdown into chunks by section headings (## or ###).
 * Each chunk preserves its heading as context.
 */
function chunkMarkdown(markdown) {
  const lines = markdown.split('\n');
  const chunks = [];
  let currentChunk = { heading: '', content: [], metadata: {} };

  for (const line of lines) {
    // Detect section headings (## or ###)
    const headingMatch = line.match(/^(#{2,3})\s+(.+)/);

    if (headingMatch) {
      // Save previous chunk if it has content
      if (currentChunk.content.length > 0) {
        const text = currentChunk.content.join('\n').trim();
        if (text.length > 50) { // Skip tiny chunks
          chunks.push({
            content: `${currentChunk.heading}\n\n${text}`,
            metadata: { ...currentChunk.metadata },
          });
        }
      }

      // Start new chunk
      const level = headingMatch[1].length;
      const heading = headingMatch[2].trim();
      currentChunk = {
        heading: `${'#'.repeat(level)} ${heading}`,
        content: [],
        metadata: {
          section: heading,
          level,
        },
      };
    } else {
      currentChunk.content.push(line);
    }
  }

  // Don't forget the last chunk
  if (currentChunk.content.length > 0) {
    const text = currentChunk.content.join('\n').trim();
    if (text.length > 50) {
      chunks.push({
        content: `${currentChunk.heading}\n\n${text}`,
        metadata: { ...currentChunk.metadata },
      });
    }
  }

  return chunks;
}

// ─── Embedding Generation ───────────────────────
/**
 * Generate embedding via Ollama's /api/embed endpoint
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama error ${response.status}: ${errorText}`);
    }

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
  console.log('🚀 PetPulse Knowledge Base Ingestion');
  console.log('─'.repeat(50));

  // 1. Read the knowledge base file
  if (!fs.existsSync(KNOWLEDGE_BASE_PATH)) {
    console.error(`❌ File not found: ${KNOWLEDGE_BASE_PATH}`);
    process.exit(1);
  }

  const markdown = fs.readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
  console.log(`📄 Read ${markdown.length} characters from ${SOURCE_NAME}`);

  // 2. Chunk the document
  const chunks = chunkMarkdown(markdown);
  console.log(`✂️  Split into ${chunks.length} chunks`);

  // 3. Check if Ollama is running and model is available
  console.log(`\n🤖 Embedding model: ${EMBEDDING_MODEL}`);
  console.log(`📡 Ollama URL: ${OLLAMA_BASE}`);

  try {
    await generateEmbedding('test');
    console.log('✅ Ollama connection OK\n');
  } catch (err) {
    console.error(`❌ Ollama connection failed: ${err.message}`);
    console.error('\n💡 Make sure Ollama is running and the model is pulled:');
    console.error(`   ollama serve`);
    console.error(`   ollama pull ${EMBEDDING_MODEL}`);
    process.exit(1);
  }

  // 4. Clear existing chunks from this source (re-ingestion)
  const { error: deleteError } = await supabase
    .from('knowledge_chunks')
    .delete()
    .eq('source', SOURCE_NAME);

  if (deleteError) {
    console.warn(`⚠️  Could not clear old chunks: ${deleteError.message}`);
  } else {
    console.log('🗑️  Cleared old chunks from this source');
  }

  // 5. Embed and insert each chunk
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const progress = `[${i + 1}/${chunks.length}]`;

    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('knowledge_chunks')
        .insert({
          content: chunk.content,
          source: SOURCE_NAME,
          metadata: chunk.metadata,
          embedding: JSON.stringify(embedding),
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      const section = chunk.metadata.section || 'Unknown';
      console.log(`  ${progress} ✅ ${section.substring(0, 60)}`);
      successCount++;
    } catch (err) {
      console.error(`  ${progress} ❌ Failed: ${err.message}`);
      failCount++;
    }

    // Small delay to avoid overwhelming Ollama
    if (i < chunks.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  // 6. Summary
  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Ingestion complete!`);
  console.log(`   Inserted: ${successCount} chunks`);
  console.log(`   Failed:   ${failCount} chunks`);
  console.log(`   Source:    ${SOURCE_NAME}`);

  // Verify count in DB
  const { count } = await supabase
    .from('knowledge_chunks')
    .select('id', { count: 'exact', head: true })
    .eq('source', SOURCE_NAME);

  console.log(`   DB total:  ${count} chunks`);
}

// ─── Run ────────────────────────────────────────
ingest().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
