/**
 * PetPulse — LLM Client (Ollama / Groq Provider)
 * 
 * Unified LLM client that switches between Ollama (local dev) and Groq (production)
 * based on the AI_PROVIDER env var. Both use the OpenAI-compatible API format.
 * 
 * Usage:
 *   import { generateAIResponse, streamAIResponse } from './llmClient.js';
 */

import { createOpenAI } from '@ai-sdk/openai';
import { generateText, streamText, stepCountIs } from 'ai';
import OpenAI from 'openai';

// Per-call wall-clock budget so a slow/stuck local model fails cleanly instead
// of hanging the request (and resetting the SSE connection).
const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS) || 90000;

// ─── Provider Configuration ─────────────────────────
const PROVIDERS = {
  ollama: {
    baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
    apiKey: 'ollama',  // Ollama doesn't need a real key
    model: process.env.OLLAMA_MODEL || 'hermes3',
    name: 'Ollama (Local)',
  },
  groq: {
    baseURL: 'https://api.groq.com/openai/v1',
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    name: 'Groq (Production)',
  },
};

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  // The mock provider needs no external client (see generate/stream below).
  if (providerName === 'mock') {
    return { providerName, config: { model: 'mock', name: 'Mock (offline)' } };
  }

  const config = PROVIDERS[providerName];

  if (!config) {
    throw new Error(`Unknown AI_PROVIDER: "${providerName}". Valid options: ${[...Object.keys(PROVIDERS), 'mock'].join(', ')}`);
  }

  if (providerName === 'groq' && !config.apiKey) {
    throw new Error('GROQ_API_KEY is required when AI_PROVIDER=groq');
  }

  return { providerName, config };
}

/**
 * Whether the mock provider is active (offline/CI — no real model call).
 */
export function isMockProvider() {
  return (process.env.AI_PROVIDER || 'ollama').toLowerCase() === 'mock';
}

/**
 * Default max tool-calling steps for the active provider.
 * Small local models (Ollama/hermes3, qwen 7B) reliably select+call ONE tool but
 * hang generating prose after a tool result, so we cap them at 1 step and render
 * the tool result as a structured card. Capable hosted models (Groq llama-3.3-70b)
 * chain multiple tools reliably. Override with AI_MAX_STEPS.
 */
export function getMaxSteps() {
  if (process.env.AI_MAX_STEPS) return Number(process.env.AI_MAX_STEPS);
  const p = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  return p === 'groq' ? 5 : 1;
}

// Canned mock reply used for offline/CI plumbing verification.
const MOCK_REPLY =
  "Hi! I'm VetAI running in offline mock mode. I can't reach a live model right now, " +
  'but the chat pipeline is working. Please consult a licensed veterinarian for medical advice.';

// ─── Create the AI SDK client ────────────────────────
let _client = null;
let _providerInfo = null;

function getClient() {
  if (!_client) {
    const { providerName, config } = getProvider();
    _providerInfo = { providerName, ...config };

    _client = createOpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      // Both Ollama and Groq are OpenAI-COMPATIBLE (not the official OpenAI API),
      // so use 'compatible' mode. 'strict' enables OpenAI strict function-calling,
      // which makes Groq hard-reject tool args (tool_use_failed) on any schema
      // mismatch — breaking tool use.
      compatibility: 'compatible',
      // When Ollama is reached through an ngrok tunnel (prod demo), skip ngrok's
      // free-tier browser interstitial so JSON responses aren't corrupted.
      headers: providerName === 'ollama' ? { 'ngrok-skip-browser-warning': 'true' } : undefined,
    });

    console.log(`🤖 AI Provider: ${config.name} (model: ${config.model})`);
  }
  return _client;
}

// ─── OpenAI-compatible client (for non-agentic AI utilities) ─────
// adminController (insights/NL query), communityController (moderation) and the
// legacy /triage controller use the raw OpenAI SDK with response_format/tools.
// getCompatClient() binds that SDK to the SAME provider chosen by AI_PROVIDER,
// so there is one provider config (no Gemini/GPT). Returns { isMock } when no
// live provider is configured, so callers fall back to their mock path.
let _compatClient = null;
export function getCompatClient() {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  if (provider === 'mock') return { isMock: true, client: null, model: 'mock' };

  if (provider === 'groq') {
    if (!process.env.GROQ_API_KEY) return { isMock: true, client: null, model: 'mock' };
    if (!_compatClient) {
      _compatClient = {
        isMock: false,
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
      };
    }
    return _compatClient;
  }

  // Default: Ollama (local, keyless). Skip ngrok interstitial when tunneled.
  if (!_compatClient) {
    _compatClient = {
      isMock: false,
      model: process.env.OLLAMA_MODEL || 'hermes3',
      client: new OpenAI({
        apiKey: 'ollama',
        baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
        defaultHeaders: { 'ngrok-skip-browser-warning': 'true' },
      }),
    };
  }
  return _compatClient;
}

/**
 * Model router — pick the best model per request (deterministic, cheap signals).
 * On Groq (which serves several open-weight models behind one API):
 *   - Arabic / complex  → GROQ_MODEL      (default llama-3.3-70b-versatile: better Arabic + reasoning)
 *   - English / quick    → GROQ_MODEL_FAST (default llama-3.1-8b-instant: sub-second, good tool-calling)
 * On other providers, returns undefined so the provider's single default model is used.
 * @param {{ lang?: string }} ctx
 */
export function pickModel({ lang = 'en' } = {}) {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  if (provider !== 'groq') return undefined;
  // Default to the fast, high-free-limit 8B (llama-3.1-8b-instant). The 70B has
  // a low free-tier rate limit, so only use it for Arabic IF explicitly enabled
  // via GROQ_MODEL_SMART.
  const FAST = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
  const SMART = process.env.GROQ_MODEL_SMART;
  return (lang === 'ar' && SMART) ? SMART : FAST;
}

/**
 * Get the model instance for use with generateText/streamText.
 * @param {string} [modelName] - override the provider's default model.
 */
export function getModel(modelName) {
  const client = getClient();
  return client(modelName || _providerInfo.model);
}

/**
 * Get current provider info
 */
export function getProviderInfo() {
  if (!_providerInfo) getClient(); // Initialize if needed
  return _providerInfo;
}

/**
 * Generate a complete text response (non-streaming)
 * 
 * @param {Object} options - generateText options
 * @param {string} options.system - System prompt
 * @param {Array} options.messages - Conversation messages
 * @param {Object} options.tools - Tool definitions
 * @param {number} options.maxSteps - Max tool-calling steps
 * @returns {Promise<Object>} The generateText result
 */
export async function generateAIResponse({ system, messages, tools, maxSteps = 5, modelName, ...rest }) {
  // Offline/CI: return a canned result with no tool calls, matching the
  // shape the controller reads (.text / .steps).
  if (isMockProvider()) {
    return { text: MOCK_REPLY, steps: [], toolCalls: [], toolResults: [] };
  }

  const model = getModel(modelName);

  // Capture completed steps so we can recover tool results if the model
  // fails to generate text after a tool call (common with small models)
  const completedSteps = [];

  try {
    return await generateText({
      model,
      system,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps), // AI SDK v5+ multi-step control (replaces maxSteps)
      temperature: 0,  // Deterministic for tool calling
      abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
      onStepFinish: (step) => {
        completedSteps.push(step);
      },
      ...rest,
    });
  } catch (err) {
    // Attach completed steps to error so the controller can recover tool results
    if (completedSteps.length > 0) {
      err.completedSteps = completedSteps;
    }
    throw err;
  }
}

/**
 * Stream a text response (SSE-compatible)
 * 
 * @param {Object} options - streamText options
 * @returns {Promise<Object>} The streamText result with async iterable
 */
export async function streamAIResponse({ system, messages, tools, maxSteps = 5, modelName, ...rest }) {
  // Offline/CI: emit the canned reply word-by-word so the SSE path can be
  // exercised without a live model. Returns an object shaped like the parts
  // of the streamText result the controller consumes (.textStream, .steps).
  if (isMockProvider()) {
    const words = MOCK_REPLY.split(' ');
    const mockResult = {
      textStream: (async function* () {
        for (const w of words) yield w + ' ';
      })(),
      steps: [],
      text: MOCK_REPLY,
      then: undefined, // ensure `await mockResult` resolves to the object itself
    };
    return mockResult;
  }

  const model = getModel(modelName);

  return streamText({
    model,
    system,
    messages,
    tools,
    stopWhen: stepCountIs(maxSteps), // AI SDK v5+ multi-step control (replaces maxSteps)
    temperature: 0,
    abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
    ...rest,
  });
}

/**
 * Generate embeddings using Ollama's embedding model
 * Falls back to a simple fetch call since AI SDK embedding support varies
 * 
 * @param {string} text - Text to embed
 * @param {string} embeddingModel - Model name (default: nomic-embed-text)
 * @returns {Promise<number[]>} The embedding vector
 */
// Bounded so a slow/down embed server fails fast → callers use keyword fallback
// instead of hanging the whole chat request.
const EMBED_TIMEOUT_MS = Number(process.env.EMBED_TIMEOUT_MS) || 5000;

export async function generateEmbedding(text, embeddingModel = 'nomic-embed-text') {
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  // Offline/CI: return a deterministic zero vector (768-dim) so RAG code paths
  // don't crash. Vector search won't be meaningful, but callers fall back to
  // keyword search when similarity is empty.
  if (providerName === 'mock') {
    return new Array(768).fill(0);
  }

  // Both ollama and groq modes embed against a local/tunneled Ollama server.
  const ollamaBase = (providerName === 'ollama')
    ? (process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://127.0.0.1:11434')
    : (process.env.OLLAMA_EMBED_URL || 'http://127.0.0.1:11434');

  const response = await fetch(`${ollamaBase}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
    body: JSON.stringify({ model: embeddingModel, input: text }),
    signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Embedding request failed: ${response.status}`);
  }
  const result = await response.json();
  return result.embeddings[0];
}

/**
 * Analyze a pet photo with a vision model — ASSIST, never diagnose.
 * Only runs when a vision model is explicitly configured (GROQ_VISION_MODEL +
 * GROQ_API_KEY on the groq provider); otherwise returns null so the caller uses
 * a safe non-vision acknowledgment. Returns short, non-diagnostic observations.
 */
export async function describePetPhoto(imageUrl, userText = '', lang = 'en') {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  const visionModel = process.env.GROQ_VISION_MODEL;
  if (provider !== 'groq' || !visionModel || !process.env.GROQ_API_KEY) return null;
  try {
    const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
    const system =
      'You are a friendly pet-care assistant, NOT a veterinarian. Look at the pet photo and give 1–3 short, ' +
      'factual, NON-diagnostic observations of what is visibly present. Never name a disease, never give a ' +
      'diagnosis or treatment. If anything looks concerning, say it should be examined by a vet. ' +
      (lang === 'ar' ? 'Reply in Arabic.' : 'Reply in English.');
    const resp = await client.chat.completions.create({
      model: visionModel,
      max_tokens: 250,
      temperature: 0.2,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: [
          { type: 'text', text: userText || 'Please look at my pet in this photo.' },
          { type: 'image_url', image_url: { url: imageUrl } },
        ] },
      ],
      signal: AbortSignal.timeout(AI_TIMEOUT_MS),
    });
    return resp?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn('Vision analysis unavailable:', err?.message || err);
    return null;
  }
}

export default { generateAIResponse, streamAIResponse, generateEmbedding, describePetPhoto, getModel, getProviderInfo };
