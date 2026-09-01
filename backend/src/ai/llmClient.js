/**
 * PetPluse — LLM Client (Ollama / Groq Provider)
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
const PROVIDER_NAMES = ['ollama', 'groq'];

// The current free-tier default. Kept in one place so the two client paths
// cannot drift onto different models.
const GROQ_DEFAULT_MODEL = 'openai/gpt-oss-20b';

// Groq retires models on its free tier, and GROQ_MODEL is an environment
// variable — so a value that was correct when it was set silently becomes a
// hard failure months later, with every request falling back and nothing
// saying why. Production sat on llama-3.1-8b-instant like this.
//
// A configured model that we know is gone is ignored in favour of the current
// default. This is deliberately a deny-list, not an allow-list: an unknown
// model id is still honoured, because the operator may well know something we
// do not. It only overrides values we can prove are dead.
const RETIRED_GROQ_MODELS = new Set([
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'llama-3.3-70b-versatile',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
  'llama3-8b-8192',
  'llama3-70b-8192',
]);

function resolveGroqModel() {
  const configured = (process.env.GROQ_MODEL || '').trim();
  if (!configured) return GROQ_DEFAULT_MODEL;
  if (RETIRED_GROQ_MODELS.has(configured)) {
    console.warn(
      `[llmClient] GROQ_MODEL="${configured}" is retired on Groq and would fail every call. ` +
      `Using "${GROQ_DEFAULT_MODEL}" instead — update GROQ_MODEL to silence this.`
    );
    return GROQ_DEFAULT_MODEL;
  }
  return configured;
}

// Resolved LAZILY (not as a module-level object literal): ESM imports are
// hoisted above `dotenv.config()` in server.js, so reading process.env at
// module-evaluation time can capture values before .env is loaded. Every
// caller goes through this function so there is exactly one definition of
// each provider's baseURL/model.
function providerConfig(name) {
  switch (name) {
    case 'ollama':
      return {
        baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
        apiKey: 'ollama',  // Ollama doesn't need a real key
        model: process.env.OLLAMA_MODEL || 'hermes3',
        name: 'Ollama (Local)',
      };
    case 'groq':
      return {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
        // Default to a CURRENT free-tier open-weights model. llama-3.3-70b-versatile
        // was deprecated on Groq's free/developer tier (2026-06-17). gpt-oss-20b is
        // open-weight, fast, and tool-capable. Override via GROQ_MODEL.
        model: resolveGroqModel(),
        name: 'Groq (Production)',
      };
    default:
      return null;
  }
}

function getProvider() {
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  // The mock provider needs no external client (see generate/stream below).
  if (providerName === 'mock') {
    return { providerName, config: { model: 'mock', name: 'Mock (offline)' } };
  }

  const config = providerConfig(providerName);

  if (!config) {
    throw new Error(`Unknown AI_PROVIDER: "${providerName}". Valid options: ${[...PROVIDER_NAMES, 'mock'].join(', ')}`);
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
      // Same config as the agentic path — a second model literal here meant the
      // agentic path and the compat path silently ran DIFFERENT models whenever
      // GROQ_MODEL was unset (it defaulted to llama-3.1-8b-instant, which is not
      // guaranteed provisioned on the free tier).
      const cfg = providerConfig('groq');
      _compatClient = {
        isMock: false,
        model: cfg.model,
        client: new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL }),
      };
    }
    return _compatClient;
  }

  // Default: Ollama (local, keyless). Skip ngrok interstitial when tunneled.
  if (!_compatClient) {
    const cfg = providerConfig('ollama');
    _compatClient = {
      isMock: false,
      model: cfg.model,
      client: new OpenAI({
        apiKey: cfg.apiKey,
        baseURL: cfg.baseURL,
        defaultHeaders: { 'ngrok-skip-browser-warning': 'true' },
      }),
    };
  }
  return _compatClient;
}

/**
 * Model router — pick the best model per request (deterministic, cheap signals).
 * On Groq (which serves several open-weight models behind one API):
 *   - default            → GROQ_MODEL       (see providerConfig: openai/gpt-oss-20b)
 *   - Arabic, if enabled → GROQ_MODEL_SMART (a stronger model for Arabic/reasoning)
 * On other providers, returns undefined so the provider's single default model is used.
 * @param {{ lang?: string }} ctx
 */
export function pickModel({ lang = 'en' } = {}) {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();
  if (provider !== 'groq') return undefined;
  // Take the default from providerConfig rather than repeating a literal here.
  // These had drifted: providerConfig defaulted to openai/gpt-oss-20b while this
  // returned llama-3.1-8b-instant — and because pickModel's value is passed as
  // `modelName` it WON, so with GROQ_MODEL unset the chat silently ran a
  // different (possibly unprovisioned) model than the configured one.
  const DEFAULT = providerConfig('groq').model;
  const SMART = process.env.GROQ_MODEL_SMART;
  return (lang === 'ar' && SMART) ? SMART : DEFAULT;
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

  // Hosted embeddings (preferred in production): set EMBEDDINGS_URL to any
  // OpenAI-compatible embeddings endpoint, plus EMBEDDINGS_KEY and EMBEDDINGS_MODEL.
  // Works with free, open-source-model providers — e.g. Jina AI's free tier with
  // the 768-dim open model `jina-embeddings-v2-base-en`, or a HuggingFace TEI
  // endpoint. Use a 768-dim model to match the knowledge_chunks vector column.
  if (process.env.EMBEDDINGS_URL) {
    const resp = await fetch(process.env.EMBEDDINGS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EMBEDDINGS_KEY ? { Authorization: `Bearer ${process.env.EMBEDDINGS_KEY}` } : {}),
      },
      body: JSON.stringify({ model: process.env.EMBEDDINGS_MODEL || embeddingModel, input: [text] }),
      signal: AbortSignal.timeout(EMBED_TIMEOUT_MS),
    });
    if (!resp.ok) throw new Error(`Hosted embedding failed: ${resp.status}`);
    const j = await resp.json();
    const vec = j?.data?.[0]?.embedding || j?.embeddings?.[0] || j?.embedding;
    if (!Array.isArray(vec)) throw new Error('Hosted embedding: unexpected response shape');
    return vec;
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

/** Strip reasoning-model scaffolding (<think>…</think>) so users see only the answer. */
function stripReasoning(text) {
  if (!text) return null;
  let t = String(text).replace(/<think>[\s\S]*?<\/think>/gi, '');
  const i = t.indexOf('<think>'); // unclosed/truncated think block
  if (i !== -1) t = t.slice(0, i);
  return t.trim() || null;
}

/** Fetch a remote image and return an OpenAI-style base64 data URL (for Ollama vision). */
async function imageToDataUrl(url) {
  const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!resp.ok) throw new Error(`image fetch ${resp.status}`);
  const type = resp.headers.get('content-type') || 'image/jpeg';
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length > 6 * 1024 * 1024) throw new Error('image too large for vision');
  return `data:${type};base64,${buf.toString('base64')}`;
}

/**
 * Analyze a pet photo with an OPEN-SOURCE vision model — ASSIST, never diagnose.
 * Two free/open-source backends, each opt-in; falls back to null (safe non-vision
 * acknowledgment) when neither is configured:
 *   • Groq (hosted, free tier): Meta's open-source Llama 4 Scout — set GROQ_API_KEY.
 *   • Ollama (self-hosted, free): e.g. llama3.2-vision — set OLLAMA_VISION_MODEL
 *     (pull it first: `ollama pull llama3.2-vision`).
 * Returns short, non-diagnostic observations.
 */
export async function describePetPhoto(imageUrl, userText = '', lang = 'en') {
  const system =
    'You are a friendly pet-care assistant, NOT a veterinarian. Look at the pet photo and give 1–3 short, ' +
    'factual, NON-diagnostic observations of what is visibly present. Never name a disease, never give a ' +
    'diagnosis or treatment. If anything looks concerning, say it should be examined by a vet. ' +
    (lang === 'ar' ? 'Reply in Arabic.' : 'Reply in English.');
  const userMsg = (content) => [
    { role: 'system', content: system },
    { role: 'user', content: [
      { type: 'text', text: userText || 'Please look at my pet in this photo.' },
      { type: 'image_url', image_url: { url: content } },
    ] },
  ];

  // 1) Groq free tier — open-source Llama 4 vision (accepts a remote image URL).
  //    Try Scout then Maverick so it works regardless of which one the tier has.
  //    Use max_completion_tokens (current Groq param; max_tokens is rejected by
  //    the newer models — the reason the raw vision call was 400ing while chat,
  //    which goes through the ai-sdk param mapper, worked fine).
  if (process.env.GROQ_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
    // qwen/qwen3.6-27b is the open-source multimodal model available on this Groq
    // account (Llama 4 Scout/Maverick 404 — not provisioned). Override via GROQ_VISION_MODEL.
    const models = process.env.GROQ_VISION_MODEL
      ? [process.env.GROQ_VISION_MODEL]
      : ['qwen/qwen3.6-27b', 'meta-llama/llama-4-scout-17b-16e-instruct'];
    for (const model of models) {
      try {
        const resp = await client.chat.completions.create({
          // Higher budget: reasoning models (Qwen) spend tokens "thinking" before
          // the answer, so 250 truncated the reply.
          model, max_completion_tokens: 700, temperature: 0.2, messages: userMsg(imageUrl),
        }, { signal: AbortSignal.timeout(AI_TIMEOUT_MS) });
        const out = stripReasoning(resp?.choices?.[0]?.message?.content);
        if (out) return out;
      } catch (err) {
        console.warn(`Groq vision (${model}) unavailable:`, err?.status || '', err?.message || err);
      }
    }
  }

  // 2) Self-hosted Ollama vision model (open-source, free) — needs a base64 image.
  const ollamaVision = process.env.OLLAMA_VISION_MODEL;
  if (ollamaVision) {
    try {
      const dataUrl = await imageToDataUrl(imageUrl);
      const base = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1';
      const resp = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ model: ollamaVision, max_tokens: 250, temperature: 0.2, messages: userMsg(dataUrl) }),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
      if (!resp.ok) throw new Error(`ollama vision ${resp.status}`);
      const j = await resp.json();
      const out = stripReasoning(j?.choices?.[0]?.message?.content);
      if (out) return out;
    } catch (err) {
      console.warn('Ollama vision unavailable:', err?.message || err);
    }
  }

  return null;
}

export default { generateAIResponse, streamAIResponse, generateEmbedding, describePetPhoto, getModel, getProviderInfo };
