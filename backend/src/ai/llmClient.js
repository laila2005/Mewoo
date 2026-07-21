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
import { generateText, streamText } from 'ai';

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
  const config = PROVIDERS[providerName];

  if (!config) {
    throw new Error(`Unknown AI_PROVIDER: "${providerName}". Valid options: ${Object.keys(PROVIDERS).join(', ')}`);
  }

  if (providerName === 'groq' && !config.apiKey) {
    throw new Error('GROQ_API_KEY is required when AI_PROVIDER=groq');
  }

  return { providerName, config };
}

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
      compatibility: providerName === 'ollama' ? 'compatible' : 'strict',
    });

    console.log(`🤖 AI Provider: ${config.name} (model: ${config.model})`);
  }
  return _client;
}

/**
 * Get the model instance for use with generateText/streamText
 */
export function getModel() {
  const client = getClient();
  return client(_providerInfo.model);
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
export async function generateAIResponse({ system, messages, tools, maxSteps = 5, ...rest }) {
  const model = getModel();

  return generateText({
    model,
    system,
    messages,
    tools,
    maxSteps,
    temperature: 0,  // Deterministic for tool calling
    ...rest,
  });
}

/**
 * Stream a text response (SSE-compatible)
 * 
 * @param {Object} options - streamText options
 * @returns {Promise<Object>} The streamText result with async iterable
 */
export async function streamAIResponse({ system, messages, tools, maxSteps = 5, ...rest }) {
  const model = getModel();

  return streamText({
    model,
    system,
    messages,
    tools,
    maxSteps,
    temperature: 0,
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
export async function generateEmbedding(text, embeddingModel = 'nomic-embed-text') {
  const providerName = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  if (providerName === 'ollama') {
    // Use Ollama's native embedding endpoint
    const ollamaBase = process.env.OLLAMA_BASE_URL?.replace('/v1', '') || 'http://127.0.0.1:11434';
    const response = await fetch(`${ollamaBase}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: embeddingModel, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status} ${await response.text()}`);
    }

    const result = await response.json();
    return result.embeddings[0];
  } else {
    // For Groq/hosted: use Ollama locally for embeddings (embeddings are always local)
    // This is a design choice: embeddings run locally even when inference is on Groq
    const ollamaBase = process.env.OLLAMA_EMBED_URL || 'http://127.0.0.1:11434';
    const response = await fetch(`${ollamaBase}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: embeddingModel, input: text }),
    });

    if (!response.ok) {
      throw new Error(`Local Ollama embedding failed (for Groq mode): ${response.status}`);
    }

    const result = await response.json();
    return result.embeddings[0];
  }
}

export default { generateAIResponse, streamAIResponse, generateEmbedding, getModel, getProviderInfo };
