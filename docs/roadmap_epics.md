# PetPulse — Product Plan: Vet Tools, Lost & Found AI, Share Cards

Professional build plan for the three epics requested. Each is phased **MVP → V2** so value ships early and safely. Effort is rough (S ≈ 1–2 days, M ≈ 3–5 days, L ≈ 1–2 weeks) for one focused developer.

Feature-flag everything new so it can be gated for the soft launch (reuse the existing `platform_settings` flags + `isFeatureLive`).

---

## Epic 1 — Vet Account & Clinic Tools

**Goal:** make PetPulse genuinely useful to a vet running a (small) clinic, so vets *want* to join. Give the vet full control, and let one assistant/secretary help without full access — no extra software, fits a one-vet clinic.

### 1.1 Roles & permissions (foundation) — **M**
- Add a **clinic** concept: a vet owns a `clinics` row; an **assistant** is a user linked to that clinic with role `clinic_assistant`.
- Permission matrix:
  | Capability | Vet | Assistant |
  |---|---|---|
  | Accept / cancel / reschedule appointments | ✅ | ✅ |
  | View patient profiles, files & history | ✅ | ❌ (config-toggle) |
  | Edit clinic profile / services / pricing | ✅ | ❌ |
  | Create / disable assistant account | ✅ | — |
  | Analytics & earnings | ✅ | ❌ |
- **Vet self-service assistant account:** vet enters assistant name + email → backend creates a `clinic_assistant` user with a temp password (reuse the guest-account creation + email flow), emailed to the assistant. Vet can **disable/enable** or **remove** the assistant anytime (a small clinic with no assistant just leaves it off).
- Data: `clinics(id, owner_vet_id, name, …)`, `users.clinic_id`, `users.role` gains `clinic_assistant`; enforce every clinic endpoint by `req.user` → clinic membership + role.

### 1.2 Patient records page — **M**
- Route `/pro-dashboard` → **Patients** tab already exists; deepen it: per-patient page with **visit history**, medical-record files (reuse `medical_records` + Cloudinary), vaccination timeline (reuse the new `vaccinations` table), and private clinic notes (`patient_notes`, clinic-scoped, never shown to the owner).
- Read paths must be clinic-scoped (a vet only sees pets they've treated / that booked them).

### 1.3 Booking control center — **M**
- One board for the vet + assistant: filter by status/date, accept/decline/reschedule, mark completed/no-show, set availability & working hours (feeds the existing slot-lookahead), block time off.
- Assistant actions are audit-logged with their name (reuse `audit_logs`).

### 1.4 Retention / "come to the platform" features — **M–L** (pick a few)
- **Auto reminders to the clinic's patients** (reuse the Autopilot engine): "Bella's rabies is due — book with Dr. X".
- **Digital vaccination certificates** the vet issues (branded PDF).
- **Clinic public page** (already have Public Profile Builder) + verified badge + reviews.
- **Earnings & commission dashboard** (partly exists) + exportable monthly report.
- **VetAI hand-off:** when a pet owner's chat looks like it needs a vet, offer "book with your clinic".

### 1.5 Upgraded "For Vets" landing page — **S–M**
- Rewrite `ForVets` around vet outcomes: *"Fill your calendar", "Run reception with one assistant seat", "Own your patient records", "Automatic recall reminders"*.
- Sections: hero + value props, "how it works" (3 steps), a mini feature matrix, social-proof placeholder, transparent pricing/commission, strong CTA ("Apply as a vet"). Bilingual EN/AR.

**Suggested order:** 1.1 → 1.3 → 1.2 → 1.5 → 1.4. Ship 1.1–1.3 behind a `clinic_tools` flag first.

---

## Epic 2 — Lost & Found Reunification + Agentic AI

**Goal:** the strongest reunification tool in the market — richer reports, safe contact, and an AI that actively works every report: reads them all, understands photos, connects people, uses location, and alerts nearby users.

### 2.1 Richer reports — **M**
- **Multiple photos** per report (`lost_pet_photos(id, lost_pet_id, url, ai_tags)`), gallery in the card + share modal. Reuse the guest-friendly Cloudinary upload.
- Structured fields already partially planned: species, breed, **colour**, size, area, and **precise location** (map pin → lat/lng; today lat/lng are placeholders).

### 2.2 Safe contact — in-app messaging + call, anti-spam — **M**
- **Message via the website** (reuse the existing chat/messaging + socket infra) so owners needn't expose a phone number.
- **Call** remains optional (phone shown only if the reporter opts in).
- **Anti-spam / anti-abuse:** rate-limit contact attempts per user per report; require login to message; "report abuse" button; hide the raw number behind a "Reveal number" click that's logged; optional masked-call later. Cooldown between calls initiated from the platform.

### 2.3 Agentic Lost & Found AI — **L** (the big one, phase it)
Build on the existing deterministic matcher (`matchScore.js`) + Autopilot, then layer AI:
- **V1 (mostly built): scans all open reports** and ranks matches (breed/area/recency) — extend Autopilot's lost/found job to run on every new report and DM likely matches.
- **Geolocation intelligence:** with real lat/lng, compute distance (Haversine already used in Autopilot); **notify users in the same area** when a matching pet is reported found nearby ("A cat matching a lost report was seen ~1.2 km away").
- **Image understanding:** run each photo through a vision model (`describePetPhoto` exists, Groq-vision) to extract tags (colour, breed guess, markings) → fold into matching. *Note: true image-embedding similarity needs a hosted vision-embedding provider; start with vision-derived tags + text matching, which needs no new infra.*
- **Community signal:** aggregate "sightings" on a report ("3 people reported seeing a similar cat near Maadi this week") and surface it on the card.
- **VetAI as the always-on helper:** in chat, "I lost my cat" → creates/updates a report, asks for photo + area, runs the matcher, subscribes the user to area alerts, and reports back what neighbours have said — the assistant that works the case 24/7.

**Dependencies / risks:** needs real geolocation capture (map picker) and a reachable vision provider for image tags; keep everything degrade-gracefully (no vision → text matching; no geo → area-token matching). Privacy: coarse location only, opt-in alerts, never expose exact home coordinates.

**Suggested order:** 2.1 (multi-photo + map pin) → 2.2 (in-app messaging + anti-spam) → 2.3 V1 (auto-match DMs) → 2.3 geo alerts → 2.3 vision tags → 2.3 VetAI orchestration.

---

## Epic 3 — Mating Share-Card Redesign — **S**

**Goal:** the current card "looks terrible" — make it a beautiful, share-worthy poster (Instagram/WhatsApp).
- Rework the mating share card to match the polished **Adoption** story card (already glassmorphic + themes): real photo, clean type hierarchy, tasteful badges, QR, footer handle, multiple color themes, HD `html2canvas` export.
- Ensure real data binds (the screenshot showed empty "S / S" placeholders — fix the data mapping).
- Add 1200×630 sizing option for link previews. Bilingual labels.

---

## Smaller queued items
- **Admin "AI Insights" panel** (quality-loop other half) — top questions + thumbs-down review. **S–M**, plan already scoped.
- **In-chat Book-a-Vet flow** — let VetAI show vet options inline and prefill the symptom, instead of just navigating to `/vets`. **S–M**.

---

## Recommended sequencing (highest value-per-effort first)
1. **Epic 3 — Share-card redesign (S)** — quick, visible polish.
2. **Epic 2.1 + 2.2 — richer reports + safe messaging/anti-spam (M)** — real community value, unblocks the AI.
3. **Epic 1.1–1.3 — vet roles + assistant + patient records + booking control (M×3)** — the vet-acquisition core.
4. **Epic 2.3 — Lost & Found agentic AI (L)**, phased.
5. **Epic 1.5 landing + 1.4 retention**, then the smaller items.

Everything ships behind feature flags so the soft launch stays clean.
