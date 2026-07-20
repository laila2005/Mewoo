/**
 * PetPulse — Agentic Hermes 3 Terminal Interface
 * 
 * Orchestrated multi-step tool calling for Hermes 3 8B.
 * Since smaller models are flaky with many tools at once,
 * we orchestrate the steps ourselves, giving the model 1-2
 * tools per step for reliable tool calling.
 * 
 * Flow: createAccount → registerPet → findAvailableVets → bookAppointment
 * 
 * Usage:
 *   node src/agent.js "I am Ahmed, a@a.com, book me for tomorrow."
 */

import { createAccount, registerPet, findAvailableVets, bookAppointment } from './tools.js';
import readline from 'readline';

const OLLAMA_URL = process.env.NGROK_URL || 'http://localhost:11434';
const TOMORROW_ISO = `${new Date(Date.now() + 86400000).toISOString().split('T')[0]}T10:00:00Z`;

// ─── Ollama Native API Call ──────────────────────
async function ollamaChat(messages, tools) {
  const body = {
    model: 'hermes3',
    messages,
    stream: false,
    options: { temperature: 0 },
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
  }

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  return res.json();
}

// ─── Tool Definitions (minimal, 1 per step) ─────
const TOOL_createAccount = {
  type: 'function',
  function: {
    name: 'createAccount',
    description: 'Create a new user account. You MUST call this tool now.',
    parameters: {
      type: 'object',
      required: ['email', 'first_name'],
      properties: {
        email: { type: 'string', description: 'User email' },
        first_name: { type: 'string', description: 'User first name' },
        last_name: { type: 'string', description: 'User last name, default empty string' },
      },
    },
  },
};

const TOOL_registerPet = {
  type: 'function',
  function: {
    name: 'registerPet',
    description: 'Register a pet for a user. You MUST call this tool now.',
    parameters: {
      type: 'object',
      required: ['owner_id', 'name'],
      properties: {
        owner_id: { type: 'string', description: 'Owner user ID (UUID)' },
        name: { type: 'string', description: 'Pet name' },
        species: { type: 'string', description: 'Species, default dog' },
      },
    },
  },
};

const TOOL_findAvailableVets = {
  type: 'function',
  function: {
    name: 'findAvailableVets',
    description: 'Find available vets. You MUST call this tool now.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max results, default 5' },
      },
    },
  },
};

const TOOL_bookAppointment = {
  type: 'function',
  function: {
    name: 'bookAppointment',
    description: 'Book a vet appointment. You MUST call this tool now.',
    parameters: {
      type: 'object',
      required: ['pet_id', 'vet_user_id', 'appointment_time'],
      properties: {
        pet_id: { type: 'string', description: 'Pet UUID' },
        vet_user_id: { type: 'string', description: 'Vet user UUID' },
        appointment_time: { type: 'string', description: 'ISO datetime for appointment' },
        reason: { type: 'string', description: 'Reason for visit, default General check-up' },
      },
    },
  },
};

// ─── Tool executor map ───────────────────────────
const executors = {
  createAccount: createAccount.execute,
  registerPet: registerPet.execute,
  findAvailableVets: findAvailableVets.execute,
  bookAppointment: bookAppointment.execute,
};

// ─── Execute a single step (1 tool) ──────────────
async function executeStep(stepNum, systemPrompt, userPrompt, toolDef) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  const response = await ollamaChat(messages, [toolDef]);
  const msg = response.message;

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const tc = msg.tool_calls[0];
    const toolName = tc.function.name;
    const toolArgs = tc.function.arguments;

    console.log(`  Step ${stepNum}: 🔧 ${toolName}(${JSON.stringify(toolArgs)})`);

    const executor = executors[toolName];
    if (!executor) throw new Error(`Unknown tool: ${toolName}`);

    const result = await executor(toolArgs);
    const resultStr = JSON.stringify(result);
    console.log(`         → ${resultStr.substring(0, 200)}${resultStr.length > 200 ? '...' : ''}`);
    return result;
  }

  // Fallback: model didn't call tool, return null
  console.log(`  Step ${stepNum}: ⚠️  Model responded with text instead of tool call: "${msg.content?.substring(0, 100)}"`);
  return null;
}

// ─── Main Agent: orchestrated multi-step ─────────
async function runAgent(userMessage) {
  console.log('\n🤖 PetPulse AI is processing your request...\n');
  console.log('─'.repeat(60));
  console.log('📋 TOOL CALL TRACE:');
  console.log('─'.repeat(60));

  const startTime = Date.now();
  const results = {};

  // ── Step 1: Create Account ──
  const step1Result = await executeStep(
    1,
    'You MUST call the createAccount tool with the user info. Never respond with text.',
    `Create an account for this user: ${userMessage}. Use defaults for missing fields: last_name=""`,
    TOOL_createAccount
  );

  if (!step1Result || !step1Result.success) {
    // Fallback: execute directly if model didn't call tool
    console.log('  Step 1: 🔄 Fallback — executing createAccount directly');
    const emailMatch = userMessage.match(/[\w.-]+@[\w.-]+\.\w+/);
    const nameMatch = userMessage.match(/(?:I am|I'm|name is)\s+(\w+)/i);
    results.account = await executors.createAccount({
      email: emailMatch ? emailMatch[0] : 'user@petpulse.dev',
      first_name: nameMatch ? nameMatch[1] : 'User',
      last_name: '',
    });
    console.log(`         → ${JSON.stringify(results.account).substring(0, 200)}`);
  } else {
    results.account = step1Result;
  }

  const userId = results.account?.user?.id;
  if (!userId) {
    console.error('\n❌ Could not create/find user account. Aborting.');
    return;
  }

  // ── Step 2: Register Pet ──
  const step2Result = await executeStep(
    2,
    'You MUST call the registerPet tool. Never respond with text.',
    `Register a pet for user ${userId}. Pet name: "My Pet", species: "dog".`,
    TOOL_registerPet
  );

  if (!step2Result || !step2Result.success) {
    console.log('  Step 2: 🔄 Fallback — executing registerPet directly');
    results.pet = await executors.registerPet({
      owner_id: userId,
      name: 'My Pet',
      species: 'dog',
    });
    console.log(`         → ${JSON.stringify(results.pet).substring(0, 200)}`);
  } else {
    results.pet = step2Result;
  }

  const petId = results.pet?.pet?.id;
  if (!petId) {
    console.error('\n❌ Could not register pet. Aborting.');
    return;
  }

  // ── Step 3: Find Available Vets ──
  const step3Result = await executeStep(
    3,
    'You MUST call the findAvailableVets tool. Never respond with text.',
    'Find available veterinarians. Return the first available vet.',
    TOOL_findAvailableVets
  );

  if (!step3Result || !step3Result.success) {
    console.log('  Step 3: 🔄 Fallback — executing findAvailableVets directly');
    results.vets = await executors.findAvailableVets({ limit: 5 });
    console.log(`         → ${JSON.stringify(results.vets).substring(0, 200)}`);
  } else {
    results.vets = step3Result;
  }

  const vetId = results.vets?.vets?.[0]?.vet_user_id;
  if (!vetId) {
    console.error('\n❌ No available vets found. Aborting.');
    return;
  }

  // ── Step 4: Book Appointment ──
  const step4Result = await executeStep(
    4,
    'You MUST call the bookAppointment tool. Never respond with text.',
    `Book appointment: pet_id="${petId}", vet_user_id="${vetId}", appointment_time="${TOMORROW_ISO}", reason="General check-up"`,
    TOOL_bookAppointment
  );

  if (!step4Result || !step4Result.success) {
    console.log('  Step 4: 🔄 Fallback — executing bookAppointment directly');
    results.booking = await executors.bookAppointment({
      pet_id: petId,
      vet_user_id: vetId,
      appointment_time: TOMORROW_ISO,
      reason: 'General check-up',
    });
    console.log(`         → ${JSON.stringify(results.booking).substring(0, 200)}`);
  } else {
    results.booking = step4Result;
  }

  // ── Step 5: Final Summary (text only, no tools) ──
  const summaryMessages = [
    { role: 'system', content: 'You are PetPulse AI. Summarize the completed actions for the user in a friendly way.' },
    { role: 'user', content: `Summarize what was done for the user:\n- Account: ${JSON.stringify(results.account?.user)}\n- Pet: ${JSON.stringify(results.pet?.pet)}\n- Vet: ${JSON.stringify(results.vets?.vets?.[0])}\n- Appointment: ${JSON.stringify(results.booking?.appointment)}` },
  ];

  const summaryResponse = await ollamaChat(summaryMessages, []);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '═'.repeat(60));
  console.log('🐾 PetPulse AI Response:');
  console.log('═'.repeat(60));
  console.log(summaryResponse.message?.content || 'All steps completed successfully!');
  console.log('═'.repeat(60));
  console.log(`⏱  Total time: ${elapsed}s | Steps: 5 (4 tool calls + 1 summary)`);
  console.log();

  return results;
}

// ─── Interactive Terminal Mode ───────────────────
async function main() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║     PetPulse AI Agent — Hermes 3 Tool Calling       ║');
  console.log('║     Seamless Onboarding & Appointment Booking       ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`🔗 Ollama: ${OLLAMA_URL}`);
  console.log(`📅 Today: ${new Date().toISOString().split('T')[0]}`);
  console.log('Type "exit" to quit.\n');

  const cliPrompt = process.argv.slice(2).join(' ');
  if (cliPrompt) {
    console.log(`📝 Running: "${cliPrompt}"\n`);
    await runAgent(cliPrompt);
    process.exit(0);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = () => {
    rl.question('You > ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed.toLowerCase() === 'exit') {
        console.log('\n👋 Goodbye!');
        rl.close();
        process.exit(0);
      }
      try {
        await runAgent(trimmed);
      } catch (err) {
        console.error('\n❌ Agent error:', err.message);
      }
      ask();
    });
  };
  ask();
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
