# PetPulse Agentic AI — Enhanced 2-Week Implementation Plan

_Evaluation of the original "Final 2-Week Plan (Agentic AI)" and an enhanced,
codebase-grounded version. Goal: replace the OpenAI/GPT dependency with a
self-hostable, open-source-LLM agentic system._

---

## 1. Verdict (TL;DR)

The original plan is a **solid learning roadmap** and picks the right building
blocks (open-weights LLM + tool calling + pgvector RAG + a graph orchestrator +
a streaming chat UI). But it is written as a **greenfield tutorial** and does
not account for what PetPulse already has. Three things must change before it is
safe to execute:

1. **Don't rebuild what exists.** PetPulse already runs on **PostgreSQL**
   (Supabase/Neon-compatible via `pg`), already has `users`, `pets`,
   `appointments`, `vet_profiles`, `mating_requests`, `ai_booking_sessions`
   (with a `conversation_history JSONB` column) and `appointments.handled_by_ai`.
   The plan's "create a `users` table with `id, name, email, phone`" would create
   a **parallel, conflicting schema**. Reuse the real tables.
2. **ngrok-to-your-PC is a demo transport, not production.** Routing live Vercel
   traffic through a tunnel to a GPU sitting in your room is fragile (single
   point of failure, rotating URLs, `OLLAMA_ORIGINS="*"` exposes your model to
   the internet). Keep it for **local dev only** and pick a real serving path
   for production (§5).
3. **Swap the provider, don't rewrite the app.** The existing agent
   (`backend/src/controllers/aiAgentController.js`) already implements the exact
   tools the plan describes (`query_doctor`, `check_availability`,
   `book_appointment`, `find_mating_partners`, `send_push_notification`) against
   the real DB. Dropping GPT is mostly a **client/base-URL swap** behind a
   provider interface — not a from-scratch LangGraph rebuild. Do the rebuild only
   where it buys you real multi-agent behavior.

The enhanced plan below keeps your 2-week shape but re-targets every task at the
real code, folds in the bugs found in the code review, and bakes security in
from day one instead of leaving it implicit.

---

## 2. What the original plan gets right

- **Open-weights + tool calling** is the correct core. Hermes 3 is a reasonable
  choice; see §6 for stronger alternatives for tool use.
- **pgvector for RAG** in the same Postgres you already use — good, no new
  datastore.
- **A graph orchestrator (LangGraph.js)** is a genuine upgrade over today's
  single `if/else` tool loop.
- **Streaming chat via the Vercel AI SDK `useChat` hook** is the right UX and
  removes the "fake typing dots over a buffered response" problem you have today.
- **`nomic-embed-text`** is a fine local embedding model.

---

## 3. Reality check — plan assumptions vs. this codebase

| Plan assumes | Reality in PetPulse | Consequence |
|---|---|---|
| Create `users(id,name,email,phone)` + `appointments` | `users(id, email, first_name, last_name, role, latitude, longitude, push_token…)` and `appointments(pet_id, vet_user_id, appointment_time, reason, status, handled_by_ai)` already exist | **Do not create new tables.** Write tools against existing schema. |
| No AI code yet | `aiAgentController.js` (OpenAI, real DB tools, mounted at `POST /api/ai/triage`) **plus** a dead LangChain microservice in `ai-services/` (unrouted, mock tools) | Consolidate to **one** service; delete or repurpose the dead one. |
| Build conversation memory from scratch | `ai_booking_sessions.conversation_history JSONB` already exists but is **never read/written** | Use it for memory instead of inventing a new store. |
| Chat is a fresh single request | Frontend (`Chatbot.jsx`, `VetTriageModal.jsx`) renders a running thread but backend is **stateless per call** | Wire real server-side memory (fixes a real UX bug). |
| Vercel AI SDK `useChat` on the frontend | Frontend uses **axios** + `dangerouslySetInnerHTML` (no SDK, no sanitizer) | Migrate the chat transport and kill the XSS surface (§7). |
| Deploy Node backend to Vercel | Already deployed to Vercel serverless (`api/index.js` → `backend/server.js`), `pg` pool `max:1` in prod | Long agent loops risk serverless timeouts; see §5. |

> Note: the live code queries `pets.gender`, `pets.is_mating`, `pets.bio`,
> `pets.location`, which are **not** in `docs/diagrams/schema.sql` — they were
> added by later migrations. Reconcile the canonical schema before RAG work so
> your embeddings/migrations don't fight an out-of-date reference.

---

## 4. Critical gaps the plan omits (fold these in)

These come directly from the code review of the current AI code. Moving to an
open model **increases** some of these risks (open models are easier to
jailbreak/prompt-inject), so treat them as first-class tasks, not cleanup:

1. **Stored/reflected XSS.** LLM- and DB-derived HTML is rendered via
   `dangerouslySetInnerHTML` with **no sanitizer anywhere** in the frontend.
   A malicious pet bio (`<img src=x onerror=…>`) becomes JS execution in another
   user's session. **Root fix:** stop shipping HTML from the model. Return
   **structured JSON** (`{type:"vet_card", providerId, name,…}`) and render with
   React components. This also removes the "EXACT HTML block" instructions from
   the prompt (which open models follow far less reliably than GPT).
2. **Unauthorized / unvalidated tool actions.** `book_appointment` inserts with a
   model-supplied `vet_id`/`datetime` — never validated as UUID/timestamp, never
   checked for vet role or ownership, and it ignores the `check_availability`
   result. **Fix:** the server owns identity (`userId` from the verified JWT,
   never from the model or request body); validate every tool argument with a
   schema (zod); enforce authz inside each tool handler; add a unique constraint
   on `(vet_user_id, appointment_time)` to close the check-then-insert race.
3. **Broken second entry point.** `VetTriageModal.jsx` sends `userLocation` as an
   object (schema requires a string → **every request 400s**) and reads
   `res.data.response` while the mounted controller returns `triage_result`
   (→ always shows the fallback). Fix as part of the frontend migration.
4. **Fragile agent loop.** `JSON.parse` of tool args sits outside the try/catch
   (one malformed arg → 500), and the loop is **single-round** (the second model
   call omits `tools`, so it can never chain `find vet → check availability →
   book`). LangGraph or a proper bounded multi-step loop fixes both.
5. **No guardrails/observability for a medical-adjacent bot.** No grounding, no
   "never diagnose/prescribe, always defer to a licensed vet" enforcement, no
   eval harness, no logging you actually read back. Open models hallucinate more —
   this is a liability requirement, not a nice-to-have.

---

## 5. The decision the plan skips: how to serve an open-source LLM

"Open-source LLM" ≠ "must self-host on my PC." Pick deliberately:

**Option A — Hosted open-weights inference (recommended to start).**
Run Llama 3.3 / Qwen 2.5 / Hermes 3 on **Together.ai, Groq, Fireworks, or
OpenRouter**. They expose an **OpenAI-compatible API**, so with the Vercel AI SDK
you change only `baseURL`, `apiKey`, and the model name — no GPU ops, works
natively with Vercel serverless, cheap, and it's still fully open-weights (no
GPT). Best path to production given you already deploy on Vercel.

**Option B — Self-host (Ollama).**
- **Local dev:** Ollama + ngrok exactly as the plan says — perfect for iterating
  for free. Keep `OLLAMA_ORIGINS` scoped to your tunnel host, not `*`.
- **Production self-host:** a persistent GPU box — **RunPod, Modal, Vast.ai, Fly.io
  GPU, or a small GPU VPS** — running Ollama/vLLM behind an authenticated reverse
  proxy. Not your desktop over ngrok.

**Recommended shape:** build a **provider abstraction** with three
interchangeable backends — `ollama` (local dev), a hosted open-weights provider
(prod), and the existing `mock` (CI/offline). Because all three speak the
OpenAI-compatible protocol, one interface covers all of them and you flip
providers with an env var. This is the single most important enhancement: it
makes "drop GPT" a config change and de-risks the whole migration.

**Serverless caveat:** multi-step agent loops + RAG + streaming can exceed Vercel
function limits and fight the `pg` pool `max:1`. If loops run long, host the
agent orchestration on a **persistent Node process** (Render/Fly/Railway) and let
Vercel serve the frontend + thin API — or use a fast hosted provider (Groq) to
keep loops short.

---

## 6. Model & library recommendations

- **Tool-calling model (hosted, prod):** `Llama-3.3-70B-Instruct` or
  `Qwen2.5-72B-Instruct` — both strong, reliable function-callers. Hermes 3 70B
  is fine too. For low latency, Groq serves Llama 3.3 70B very fast.
- **Tool-calling model (local dev on modest GPU):** `Qwen2.5-7B/14B-Instruct`,
  `Llama-3.1-8B-Instruct`, or `Hermes-3-Llama-3.1-8B`. Smaller models are
  flakier at tool calls → keep tool schemas tiny, use `zod` + a JSON-repair/retry
  step, and lower temperature to 0.
- **Embeddings:** `nomic-embed-text` (768-dim) via Ollama, or `bge-small`.
  Match the pgvector column dimension to whatever you pick.
- **Orchestration:** LangGraph.js is a reasonable choice, but you can also get
  90% of the value with the **Vercel AI SDK's `generateText`/`streamText` +
  `tools` + `maxSteps`**, which is far less code and streams natively. Recommend:
  **start with the AI SDK multi-step loop**; adopt LangGraph only when you truly
  need branching multi-agent routing (triage → QA → booking as separate agents).
- **Validation:** `zod` for every tool's args (the plan already lists this —
  keep it, and use it to fix gap #2).

---

## 7. Security workstream (runs in parallel across both weeks)

| Fix | Where | When |
|---|---|---|
| Replace model-emitted HTML with structured JSON + React card components | `Chatbot.jsx`, prompt, tool return shapes | Week 1–2 |
| Add DOMPurify for any remaining rich text | `petpulse-web` | Week 1 |
| Server owns `userId` from JWT; never trust model/body identity | all tool handlers | Week 1 |
| zod-validate every tool argument before DB use | tool registry | Week 1 |
| Enforce authz + role checks in `book_appointment` etc. | tool handlers | Week 1 |
| `UNIQUE (vet_user_id, appointment_time)` + insert-conflict handling | migration | Week 1 |
| Guardrail prompt + refusal for diagnosis/prescription; always defer to vet | system prompt + post-filter | Week 2 |
| Scope `OLLAMA_ORIGINS`; auth on any exposed inference endpoint; tighten CORS | `ai-services`/proxy | Week 1 |
| Eval harness for tool-call accuracy + injection tests | new `tests/ai/` | Week 2 |

---

## 8. Enhanced 2-week plan (day by day)

### Week 1 — Provider swap, real tools, hardening

**Task 1.1 — Local open-LLM dev loop (Days 1–2)**
- Install Ollama, `ollama pull qwen2.5:7b-instruct` (or `hermes3`), and a hosted
  fallback account (Together/Groq/OpenRouter) for prod parity.
- Expose locally with ngrok for dev **only**; scope `OLLAMA_ORIGINS` to the
  tunnel host. Document that this is not the production transport.
- **Outcome:** a `chatComplete()` call that hits Ollama via the OpenAI-compatible
  `/v1` endpoint and logs a tool-calling response — no GPT key involved.

**Task 1.2 — Provider abstraction + delete the dead stack (Days 2–3)**
- Introduce an `LLMProvider` interface with `ollama` / `hosted` / `mock`
  implementations, selected by env (`AI_PROVIDER`). All three are
  OpenAI-compatible, so it's one client with different `baseURL`/`apiKey`/`model`.
- Point the existing `aiAgentController` at the interface instead of the hardcoded
  `new OpenAI(...)`. Keep the mock path as the `mock` provider (don't duplicate it
  inline).
- Delete or repurpose `ai-services/` + `aiIntegrationController.triageBridge`
  (dead, unrouted, divergent contract). One AI service, one response schema.
- **Outcome:** flipping `AI_PROVIDER` swaps GPT → open model with zero call-site
  changes; CI runs on `mock`.

**Task 1.3 — Tool registry against the real schema (Days 3–5)**
- Refactor the 5 inline tools into a registry: `{ name: { schema (zod), handler } }`,
  from which both the tool list and the dispatch loop are derived. Fixes the
  unknown-tool-silent-fail and moves `JSON.parse` inside error handling.
- Rewrite tools against **existing** tables (`users.first_name/last_name/role`,
  `appointments.vet_user_id/appointment_time/handled_by_ai=true`). Reuse
  `bookingController`'s booking logic via a shared `bookAppointment()` service so
  future-date validation and notifications aren't dropped.
- Fix the mating query: case-insensitive gender match, `LIMIT`, correct
  selected-pet handling.
- **Outcome:** all tools validated, authorized, and DB-correct; booking via chat
  actually persists with `handled_by_ai=true`.

**Task 1.4 — Multi-step loop + memory (Days 5–7)**
- Replace the single-round loop with a bounded multi-step loop (AI SDK `maxSteps`,
  or a `while(toolCalls && step<MAX)`), passing `tools` on every turn so the model
  can chain find → check → book.
- Persist/replay conversation in `ai_booking_sessions.conversation_history`
  (already in the schema) keyed by a session id from the client.
- **Outcome:** terminal test — "I'm Ahmed, a@a.com, book me for tomorrow" runs
  account/pet resolution → availability → booking in one coherent multi-step run,
  with memory across turns.

### Week 2 — RAG, orchestration, secure streaming UI

**Task 2.1 — pgvector RAG in the existing DB (Days 8–9)**
- `CREATE EXTENSION vector;` add a `knowledge_chunks(id, content, embedding
  vector(768), source, metadata)` table + an ivfflat/hnsw index. Reconcile
  `schema.sql` with live migrations first.
- Ingestion script: parse the vet-guidelines PDF (**one** PDF lib — the backend
  currently declares three unused ones; remove the extras), chunk, embed with
  `nomic-embed-text`, upsert. Store source refs for citations.
- `searchMedicalGuidelines` tool doing cosine KNN, returning **grounded snippets
  with sources**.
- **Outcome:** the agent answers vet questions from retrieved, cited chunks — with
  a hard guardrail to never diagnose/prescribe and always recommend a licensed vet.

**Task 2.2 — Orchestration (Days 10–12)**
- Start with the AI SDK multi-step agent + intent-aware system prompt. If real
  multi-agent routing is needed, add **LangGraph.js**: `State {messages, intent}`,
  nodes `triage`/`qa`/`booking`, conditional edges on detected intent. Run it in a
  **persistent process** if loops are long.
- **Outcome:** conversations route dynamically (medical Q → RAG QA; "book" →
  booking agent; emergency → escalate) with bounded, observable steps.

**Task 2.3 — Secure streaming React UI (Days 13–14)**
- `POST /api/chat` streams (SSE) the compiled agent. Migrate `Chatbot.jsx` and fix
  `VetTriageModal.jsx` to the AI SDK `useChat` hook (fixes the object-vs-string
  `userLocation` 400 and the `response` vs `triage_result` mismatch).
- **Render structured JSON as React components** (vet card, booking widget,
  mating card) — no `dangerouslySetInnerHTML` of model output; DOMPurify anything
  that must stay rich text.
- **Outcome:** website chat streams token-by-token from the open-source model,
  runs authorized tools against Postgres, renders safe interactive cards, and
  remembers the conversation.

---

## 9. Definition of done / acceptance criteria

- [ ] No `openai` GPT dependency on the request path; `AI_PROVIDER` switches
      `ollama` / hosted-open-weights / `mock`.
- [ ] Zero raw model HTML reaches the DOM; XSS test payload in a pet bio does not
      execute.
- [ ] `book_appointment` rejects non-UUID/invalid vet_id, enforces role + auth,
      cannot double-book (DB constraint), and sets `handled_by_ai=true`.
- [ ] Multi-turn booking completes purely in chat with server-side memory.
- [ ] RAG answers cite sources; the bot refuses diagnosis/prescription.
- [ ] Eval harness: tool-call accuracy on a fixed prompt set + a prompt-injection
      suite, run in CI on the `mock`/local provider.
- [ ] `ai-services/` dead stack removed or made the single real path; both chat
      entry points share one response schema.

---

_Bottom line: keep the original plan's spine, but (1) reuse your real Postgres
schema and unused AI tables, (2) make the LLM a swappable provider so "drop GPT"
is one env var, (3) treat ngrok as dev-only and choose a real serving path, and
(4) promote security (XSS, authz, guardrails) to day-one tasks — because
open-weights models make those risks larger, not smaller._
