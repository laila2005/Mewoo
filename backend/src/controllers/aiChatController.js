/**
 * PetPulse — AI Chat Controller
 * 
 * Unified chat endpoint with:
 *   - Multi-step tool calling (Task 1.4)
 *   - Conversation memory via ai_booking_sessions (Task 1.4)
 *   - Intent-aware routing (Task 2.2)
 *   - SSE streaming support (Task 2.3)
 *   - Structured JSON responses (Task 2.3)
 */

import { supabaseAdmin } from '../config/supabase.js';
import { generateAIResponse, streamAIResponse } from '../ai/llmClient.js';
import { allTools } from '../ai/tools.js';
import { getSystemPrompt } from '../ai/systemPrompts.js';

/**
 * POST /api/ai/chat
 * 
 * Body: { message: string, sessionId?: string }
 * Headers: Authorization (optional), Accept: text/event-stream (for SSE)
 * 
 * Returns structured JSON or SSE stream
 */
export async function chat(req, res) {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
    }

    // ─── Session Management ─────────────────────────
    let session = null;
    let conversationHistory = [];

    if (sessionId) {
      // Load existing session
      const { data, error } = await supabaseAdmin
        .from('ai_booking_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (data && !error) {
        session = data;
        conversationHistory = data.conversation_history || [];
      }
    }

    // Create a new session if none exists
    if (!session) {
      const userId = req.user?.id || null;
      const { data: newSession, error: createError } = await supabaseAdmin
        .from('ai_booking_sessions')
        .insert({
          user_id: userId || '00000000-0000-0000-0000-000000000000', // Guest fallback
          status: 'active',
          conversation_history: [],
        })
        .select('*')
        .single();

      if (createError) {
        console.error('Failed to create session:', createError.message);
        // Continue without persistence
        session = { id: 'temp-' + Date.now(), conversation_history: [] };
      } else {
        session = newSession;
      }
    }

    // ─── Build Messages Array ───────────────────────
    // Add the new user message
    const messages = [
      ...conversationHistory.map(m => ({
        role: m.role,
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // Keep conversation within context limits (last 20 messages)
    const trimmedMessages = messages.slice(-20);

    // ─── System Prompt ──────────────────────────────
    const systemPrompt = getSystemPrompt({ includeRAG: true, includeOnboarding: true });

    // ─── Check for SSE streaming ────────────────────
    const wantsStream = req.headers.accept?.includes('text/event-stream');

    if (wantsStream) {
      return await handleStreamingResponse(req, res, systemPrompt, trimmedMessages, session, message);
    }

    // ─── Non-streaming response ─────────────────────
    return await handleJsonResponse(req, res, systemPrompt, trimmedMessages, session, message);

  } catch (err) {
    console.error('AI Chat error:', err);
    res.status(500).json({
      error: 'AI service temporarily unavailable.',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
}

/**
 * Handle non-streaming JSON response
 */
async function handleJsonResponse(req, res, systemPrompt, messages, session, userMessage) {
  const result = await generateAIResponse({
    system: systemPrompt,
    messages,
    tools: allTools,
    maxSteps: 5,
  });

  // Extract the final text and tool call info
  const responseText = result.text || '';
  const toolResults = extractToolResults(result);

  // Build structured response
  const structuredResponse = buildStructuredResponse(responseText, toolResults);

  // ─── Persist conversation ─────────────────────────
  const updatedHistory = [
    ...(session.conversation_history || []),
    { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant', content: responseText, toolResults, timestamp: new Date().toISOString() },
  ];

  // Keep last 50 messages to avoid JSONB bloat
  const trimmedHistory = updatedHistory.slice(-50);

  if (session.id && !session.id.startsWith('temp-')) {
    await supabaseAdmin
      .from('ai_booking_sessions')
      .update({
        conversation_history: trimmedHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);
  }

  // ─── Log to ai_triages for analytics ──────────────
  try {
    await supabaseAdmin.from('ai_triages').insert({
      user_id: req.user?.id || null,
      symptoms: userMessage,
      result: responseText,
    });
  } catch (logErr) {
    // Don't fail the request on logging errors
    console.warn('Failed to log triage:', logErr.message);
  }

  res.json({
    sessionId: session.id,
    response: structuredResponse,
    text: responseText,
  });
}

/**
 * Handle SSE streaming response
 */
async function handleStreamingResponse(req, res, systemPrompt, messages, session, userMessage) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Session-Id', session.id);
  res.flushHeaders();

  // Send session ID as first event
  sendSSE(res, { type: 'session', sessionId: session.id });

  let fullText = '';
  const toolResults = [];

  try {
    const result = await streamAIResponse({
      system: systemPrompt,
      messages,
      tools: allTools,
      maxSteps: 5,
    });

    // Stream text chunks
    for await (const chunk of result.textStream) {
      fullText += chunk;
      sendSSE(res, { type: 'token', content: chunk });
    }

    // After streaming completes, get the final result
    const finalResult = await result;

    // Extract tool results from steps
    if (finalResult.steps) {
      for (const step of finalResult.steps) {
        if (step.toolCalls) {
          for (const tc of step.toolCalls) {
            toolResults.push({
              tool: tc.toolName,
              args: tc.args,
              result: step.toolResults?.find(tr => tr.toolCallId === tc.toolCallId)?.result,
            });
            sendSSE(res, { type: 'tool_call', tool: tc.toolName, status: 'completed' });
          }
        }
      }
    }

    // Build structured response and send as final event
    const structuredResponse = buildStructuredResponse(fullText, toolResults);
    sendSSE(res, { type: 'done', response: structuredResponse });

    // Persist conversation
    const updatedHistory = [
      ...(session.conversation_history || []),
      { role: 'user', content: userMessage, timestamp: new Date().toISOString() },
      { role: 'assistant', content: fullText, toolResults, timestamp: new Date().toISOString() },
    ];

    if (session.id && !session.id.startsWith('temp-')) {
      await supabaseAdmin
        .from('ai_booking_sessions')
        .update({
          conversation_history: updatedHistory.slice(-50),
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id);
    }

  } catch (streamErr) {
    console.error('Streaming error:', streamErr);
    sendSSE(res, { type: 'error', message: 'AI response interrupted.' });
  }

  res.end();
}

/**
 * Extract tool call results from the generateText response
 */
function extractToolResults(result) {
  const toolResults = [];

  if (result.steps) {
    for (const step of result.steps) {
      if (step.toolCalls) {
        for (const tc of step.toolCalls) {
          const matchingResult = step.toolResults?.find(tr => tr.toolCallId === tc.toolCallId);
          toolResults.push({
            tool: tc.toolName,
            args: tc.args,
            result: matchingResult?.result || null,
          });
        }
      }
    }
  }

  // Legacy support for older AI SDK versions
  if (toolResults.length === 0 && result.toolCalls) {
    for (const tc of result.toolCalls) {
      toolResults.push({
        tool: tc.toolName,
        args: tc.args,
        result: result.toolResults?.find(tr => tr.toolCallId === tc.toolCallId)?.result || null,
      });
    }
  }

  return toolResults;
}

/**
 * Build a structured response from text and tool results.
 * Converts raw text + tool data into typed message blocks for the frontend.
 */
function buildStructuredResponse(text, toolResults) {
  const blocks = [];

  // Process tool results into structured blocks
  for (const tr of toolResults) {
    if (tr.tool === 'bookAppointment' && tr.result?.success) {
      blocks.push({
        type: 'booking_confirmation',
        data: {
          appointment: tr.result.appointment,
          message: tr.result.message,
        },
      });
    }

    if (tr.tool === 'createAccount' && tr.result?.success && !tr.result.already_existed) {
      blocks.push({
        type: 'account_created',
        data: {
          user: tr.result.user,
          temporary_password: tr.result.temporary_password,
          isGuest: true,
        },
      });
    }

    if (tr.tool === 'findAvailableVets' && tr.result?.success) {
      blocks.push({
        type: 'vet_list',
        data: {
          vets: tr.result.vets,
          count: tr.result.count,
        },
      });
    }

    if (tr.tool === 'searchMedicalGuidelines' && tr.result?.success && tr.result.chunks?.length > 0) {
      blocks.push({
        type: 'medical_info',
        data: {
          chunks: tr.result.chunks,
          disclaimer: 'This is general information. Please consult your veterinarian for advice specific to your pet.',
        },
      });
    }
  }

  // Add the text response
  if (text && text.trim()) {
    blocks.push({
      type: 'text',
      data: { content: text },
    });
  }

  return { blocks };
}

/**
 * Send an SSE event
 */
function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export default { chat };
