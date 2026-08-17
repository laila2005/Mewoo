# PetPluse — Agentic AI Feature Plan (Parity + Autonomy)

Goal: make the **new open-source agentic stack** (Groq/Ollama via `backend/src/ai/*` +
`aiChatController`) do **everything the old GPT/Gemini stack did**, then add the
**proactive automation** that makes VetAI an autonomous concierge — not just a chatbot
that answers when spoken to.

Status legend: ✅ done · 🟡 partial · 🔴 missing · ➕ new idea

---

## 0. Where we are today

**New stack tools (live):** `createAccount`, `registerPet`, `findAvailableVets`,
`bookAppointment`, `searchMedicalGuidelines` (RAG). Server-owned identity, zod validation,
authz on booking, streaming + structured JSON cards. Runs on the prod DB via `pg`.

**Old GPT/Gemini capabilities NOT yet in the new stack** (from `aiAgentController.js`,
`adminController.js`, `communityController.js`, `petController.js`):

| Old capability | Where | New stack |
|---|---|---|
| `query_doctor` — find vet/trainer **by name** | aiAgentController | 🟡 only `findAvailableVets` (no name/trainer search) |
| `check_availability` — explicit slot check | aiAgentController | 🟡 implicit (unique constraint) |
| `find_mating_partners` — **mating smart matching** | aiAgentController | 🔴 missing |
| Adoption matchmaking (adoption cards) | system prompt | 🔴 missing |
| Behavioral / trainer recommendations | system prompt | 🔴 missing |
| Navigation actions (route the user) | system prompt | 🔴 missing |
| `send_push_notification` (real delivery) | aiAgentController (stub) | 🔴 missing |
| **AdminPulse**: exec insights + NL data query | adminController | 🔴 missing (provider = Gemini) |
| **Content moderation** on posts/comments | communityController | 🔴 missing (provider = Gemini) |
| **Medical-record extraction** from documents | petController | 🔴 broken (hallucinated + IDOR) |

> All three old AI utilities still point at **Gemini** (uncommitted). Since we chose
> Groq/Ollama, they must move to the shared provider — see Part B.

---

## Part A — Feature parity: new agentic tools (chatbot-driven)

Add these as `tool()` entries in `backend/src/ai/tools.js`, each returning **structured
JSON blocks** rendered by `ChatMessageRenderer` (no model HTML). All writes stay
server-authorized against `ctx.userId`.

| Tool | Purpose | DB / notes |
|---|---|---|
| `searchProviders({ name?, role, specialty?, nearLat?, nearLng? })` | Replaces `query_doctor`; finds **vets and trainers** by name/specialty, nearest-first | `users` + `vet_profiles`/`trainer_profiles`; Haversine sort |
| `checkAvailability({ vet_user_id, datetime })` | Explicit slot check for conversational flow | `appointments` unique `(vet_user_id, appointment_time)` |
| `findMatingPartners({ species, gender, breed?, location? })` | **Mating smart matching** — opposite gender, same species, area | `pets WHERE is_mating` + owner join → `mating_match` block |
| `proposeMatingMatch({ target_pet_id, my_pet_id })` | Actually send a match request (authz: my_pet belongs to user) | `mating_requests` |
| `findAdoptablePets({ species?, breed?, location? })` | Adoption matchmaking → `adoption` cards | `pets WHERE is_adoptable` / `adoptable_pets` |
| `findTrainers({ specialty?, near? })` | Behavioral support | `trainer_profiles` |
| `sendNotification({ title, body })` | Real in-app notification to the current user (replaces console stub) | existing `notifications` table + `users.push_token` |
| `navigateTo({ route, label })` | Structured `navigate` block → React button (safe) | frontend router |
| `reportLostPet` / `searchFoundReports` *(optional)* | Lost & Found entry points | `lost_pets`, `found_reports` |

Also: **deterministic emergency detector** (regex on symptoms before the model) → forces
the emergency card + nearest emergency vet, independent of model compliance.

---

## Part B — Backend AI utilities (not chatbot): move Gemini → shared provider

These are server-side, not conversational. Keep them, but route through the shared
provider config so "drop GPT/Gemini" is one env var and there is **one** AI provider.

| Utility | Fix |
|---|---|
| AdminPulse insights + NL query (`adminController`) | Use shared Groq/Ollama client; keep admin-only + mock fallback |
| Content moderation (`communityController`) | Same; run on post/comment create |
| Medical-record extraction (`petController.uploadMedicalRecord`) | **Fix IDOR** (verify `owner_id === req.user.id`), do **real** text extraction (pdf-parse/OCR) → then LLM structuring; validate `document_url`; store as *unverified* until reviewed |

---

## Part C — Proactive autonomy: "PetPluse Autopilot" ➕

The headline you asked for: the agent **acts on a schedule**, not only on request.

**Infrastructure needed (one-time):**
- A **scheduled runner** — Vercel Cron Jobs (or a small worker on Render/Railway, since
  long agent loops fight Vercel's serverless limits + `pg` `max:1`). Hits an internal,
  token-guarded endpoint (`POST /api/ai/jobs/run`).
- Reuse the existing **`notifications`** table + `users.push_token` for delivery.
- New **`vaccinations`** table (`pet_id, vaccine_name, given_at, due_at`) — or derive from
  `medical_records.summary.vaccines`. Needed for the vaccination feature specifically.
- **Human-in-the-loop default:** proactive bookings **propose + one-tap confirm**, not
  silent execution (trust + liability). A per-user "full autopilot" opt-in can allow
  auto-confirm for routine items.

**Autonomous jobs:**

| Job | Trigger | Action |
|---|---|---|
| 💉 **Vaccination auto-booking** (your ask) | `due_at` within N days | Find nearest vet + owner's usual slot → **propose booking** (`handled_by_ai=true`) → notify with one-tap confirm |
| ⏰ Appointment reminders | 24h / 2h before | Notify owner (and vet) |
| 🩺 Post-visit follow-up | 24–48h after `completed` | "How is {pet}?" + rebook if needed |
| 💗 Mating match alerts | new compatible pet lists | Notify owners of matching pets |
| 🏠 Adoption nudges | new adoptable pet matches saved prefs | Notify interested users |
| 🔎 Lost & Found auto-match | new `found_report` | AI image match vs `lost_pets` (`ai_match_score`) → auto-notify likely owner |
| 🗓️ Annual wellness | age/species cadence | Remind + propose check-up |
| 🎁 PulseBox rewards | points cross a threshold | Notify reward unlocked |

**Further suggestions (agent manages automatically):**
- 🌡️ Seasonal/weather health alerts (e.g. heatstroke risk for flat-faced breeds in summer).
- 💊 Medication & refill reminders from extracted medical records.
- 📄 Pre-visit auto-summary of a pet's history for the vet.
- 🛒 Marketplace: low-stock alerts to vendors; abandoned-cart nudge to buyers.
- 🔁 Re-engagement for inactive owners.

---

## Part E — Bilingual (Arabic / English)

VetAI must understand and reply in the **user's input language** (Arabic or English) —
essential for the Egypt market. Implemented via a `LANGUAGE_RULE` in the system prompt
(detect + mirror the user's language, incl. disclaimers). ✅ Verified: an Arabic query
returns a full Arabic answer.
- **Model quality:** hermes3 (local) handles Arabic adequately; Groq/llama-3.3-70b is
  stronger — recommended for production Arabic.
- **Remaining (Phase 3):** localize the structured **card labels** ("Available
  Veterinarians", disclaimers) via frontend i18n; today card chrome is English while the
  model's prose follows the user's language. Consider an Arabic knowledge base for RAG.

## Part D — Cross-cutting (from the enhanced plan's Definition of Done)

- ✅ Server-owned identity, zod validation, booking authz, XSS closed (DOMPurify), pg-backed.
- 🟡 Extend authz to new write tools (mating/adoption/notifications).
- 🔴 **Guardrail post-filter** + deterministic emergency protocol (prompt-only today).
- 🔴 **Eval harness** (`backend/tests/ai/`): tool-call accuracy on a fixed prompt set + a
  prompt-injection suite; run on the `mock`/local provider in CI.
- 🔴 **Observability**: log every tool call + decision (extend `ai_triages`, add a
  `tool_calls` log) so proactive actions are auditable.
- 🔴 Retire the legacy `/api/ai/triage` path once parity tools land (one AI service).

---

## Suggested sequencing

**Phase 1 — Parity (no new infra): ✅ DONE + live-verified.** mating, adoption,
provider-by-name/trainers, navigation tools in the new stack; moved AdminPulse +
moderation + medical-extraction off Gemini onto Groq/Ollama; fixed medical-record IDOR;
bilingual Arabic/English.

**Phase 2 — Proactive core: ✅ DONE + verified.** `vaccinations` table + per-user
`autopilot_opt_in` + `notifications`; cron-guarded `POST/GET /api/ai/jobs/run` (+ Vercel
cron); vaccination job (propose+confirm by default, full auto-booking when opted in) +
appointment reminders. `PATCH /api/ai/autopilot` toggles opt-in.

**Phase 3 — Advanced autonomy + rigor: ✅ core DONE + verified.** Deterministic bilingual
emergency guardrail; **eval harness** (8/8) + tool-call **observability**; **mating
new-match alerts** + **lost-&-found proximity auto-match** (Haversine, with `dryRun` safety);
**frontend i18n** for Arabic/English card labels.
Remaining (future / infra-dependent): true image-vision lost&found matching (CLIP/llava),
adoption alerts (needs a saved-preferences model), re-engagement + vendor inventory,
Arabic RAG knowledge base, retire legacy `/triage`.
