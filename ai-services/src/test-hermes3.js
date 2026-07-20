/**
 * PetPulse — Hermes 3 Connection Test
 * 
 * Uses the Vercel AI SDK (@ai-sdk/openai) to send a prompt to a locally-running
 * Ollama instance (hermes3) exposed via ngrok.
 * 
 * Usage:
 *   NGROK_URL=https://xxxx.ngrok-free.app  node src/test-hermes3.js
 * 
 * Or for local testing without ngrok:
 *   node src/test-hermes3.js
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

// --- Configuration ---
// Set NGROK_URL env var to your ngrok forwarding URL, or defaults to localhost
const NGROK_URL = process.env.NGROK_URL || 'http://localhost:11434';

const ollama = createOpenAI({
  baseURL: `${NGROK_URL}/v1`,
  apiKey: 'ollama', // Ollama doesn't require a real API key
  headers: {
    'ngrok-skip-browser-warning': 'true', // Required to bypass ngrok's browser interstitial
  },
});

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       PetPulse — Hermes 3 Connection Test       ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();
  console.log(`🔗 Ollama endpoint: ${NGROK_URL}`);
  console.log('📡 Sending prompt to Hermes 3...\n');

  const startTime = Date.now();

  const { text, usage } = await generateText({
    model: ollama('hermes3'),
    prompt:
      'You are a helpful veterinary AI assistant for PetPulse. ' +
      'Explain in 2-3 sentences why regular check-ups are important for pets.',
  });

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('✅ Hermes 3 Response:');
  console.log('─'.repeat(50));
  console.log(text);
  console.log('─'.repeat(50));
  console.log();
  console.log(`⏱  Response time: ${elapsed}s`);
  console.log(`📊 Token usage:   prompt=${usage?.promptTokens ?? 'N/A'}, completion=${usage?.completionTokens ?? 'N/A'}, total=${usage?.totalTokens ?? 'N/A'}`);
  console.log('\n🎉 Hermes 3 is working! The local GPU + tunnel setup is complete.');
}

main().catch((error) => {
  console.error('\n❌ Failed to connect to Hermes 3:\n');
  console.error(error.message || error);
  console.error('\nTroubleshooting:');
  console.error('  1. Is Ollama running?  →  ollama serve');
  console.error('  2. Is hermes3 pulled?  →  ollama list');
  console.error('  3. Is ngrok tunneling? →  ngrok http 11434');
  console.error('  4. Is NGROK_URL set?   →  set NGROK_URL=https://xxxx.ngrok-free.app');
  process.exit(1);
});
