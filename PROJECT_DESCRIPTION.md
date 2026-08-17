# PetPluse — Platform Description

---

## 1. Overview

**PetPluse** is a location-aware, full-stack platform that unifies the fragmented pet care market in Egypt into a single trusted destination. It connects pet owners with verified veterinarians, certified trainers, licensed pet shops, and a moderated community — and adds an agentic AI assistant that can actually complete tasks on the user's behalf rather than merely answering questions.

The platform addresses four concrete market failures:

| Problem | How PetPluse answers it |
| --- | --- |
| Booking a vet means phone tag and no confirmation | Real-time availability, instant booking, email confirmation with calendar attachment |
| Service listings are unverified and often stale | Document-backed verification with admin review before a professional goes live |
| Emergencies get generic advice or none at all | Deterministic emergency detection that intercepts before any AI model runs |
| Pet businesses can't reach customers online | Self-service storefronts, bulk catalogue import, and paid placement |

**Live deployment:** `petpulse-showcase.vercel.app`
**Interface languages:** English and Arabic (RTL-aware), with the AI assistant answering in the language it was addressed in.

---

## 2. Access Model — Six Roles

PetPluse implements Role-Based Access Control enforced at the route layer (`requireAuth`, `requireRole`) and again inside every controller through ownership checks written into the SQL `WHERE` clause, so authorisation cannot be bypassed by guessing an identifier.

### 🐾 Pet Owner
The default account. Manages pet profiles and medical history, books veterinary and training appointments, shops the marketplace, posts to the community, reports lost pets, and applies to adopt.

### 🩺 Veterinarian
Runs a clinic presence: public profile, credentials and licence number, consultation fee, specialties, working days and hours. Manages an appointment queue, patient records with visit history, clinic staff seats, and performance analytics.

### 🎓 Trainer
Runs an independent training practice: certifications, training methodology, session pricing, service area, and availability. Sees a session tracker shaped for training work rather than clinical consultations.

### 🛍️ Vendor (Pet Shop)
Operates a storefront: product catalogue with stock control, bulk catalogue import from a spreadsheet, order management, customer reviews with replies, paid banner campaigns, and revenue analytics.

### 🧑‍💼 Clinic Assistant
A delegated reception seat created and controlled by a veterinarian. Can accept, reschedule, and cancel appointments for that clinic without gaining access to clinical records or the vet's own settings. Seats can be disabled or revoked at any time, and every action is written to the audit log.

### 🛡️ Administrator
Platform oversight: user management and role changes, professional credential verification, content moderation queue with appeals, booking and subscription oversight, feature flags, commission settings, database health metrics, audit log, and an AI-assisted analytics console.

---

## 3. Feature Catalogue

### 🤖 Agentic AI Copilot — "VetAI"

The flagship feature, and deliberately **built on free and self-hosted models — no paid OpenAI subscription is used**. The provider is swappable through a single environment variable (`AI_PROVIDER`): Groq's free inference tier in production, a local Ollama model for offline development, and a deterministic mock provider for continuous integration. All three speak the same OpenAI-compatible protocol, so the application code never changes.

**Task execution, not just conversation.** The assistant is equipped with ten typed, schema-validated tools it can call to do real work:

| Tool | What it does |
| --- | --- |
| `createAccount` | Registers a new user mid-conversation |
| `registerPet` | Adds a pet to the owner's profile |
| `findAvailableVets` | Finds vets by specialty, location, and availability |
| `suggestSlots` | Reads a provider's real working hours and returns open times |
| `bookAppointment` | Creates a confirmed booking |
| `searchProviders` | Looks up vets and trainers by name or specialty |
| `searchMedicalGuidelines` | Retrieves vetted guidance from the knowledge base |
| `findAdoptablePets` | Matches pets available for adoption |
| `findMatingPartners` | Finds compatible breeding matches |
| `navigateTo` | Moves the user to the right page in the app |

**Safety before intelligence.** Emergency and toxicity detection runs *deterministically, before the model is ever called* — a dog that ate chocolate triggers the emergency path from a keyword rule, not from a model's judgement, in both English and Arabic. Toxic-medication warnings, urgency grading, and a final screening pass over the model's reply are all independent of model behaviour, so a slow, throttled, or misbehaving model can never suppress a safety response.

**Grounded answers.** A retrieval layer searches a curated veterinary knowledge base before answering. Ranking weights rare, meaningful terms above common ones and applies species matching, so a question about cats does not return dog guidance. When the model is unavailable, the retrieval answer is served on its own rather than failing silently.

**Agentic UI.** The assistant returns structured blocks the interface renders as real controls — a date-and-time slot picker, appointment action buttons, calendar links, and navigation cards — so the conversation drives the application rather than describing it. Every link the assistant emits is validated against the application's real route table, so it cannot send a user to a page that does not exist.

**Conversational booking.** A dedicated booking flow understands dates and times the way people write them: "next Tuesday", "tomorrow at 4", Arabic-Indic numerals, and ISO timestamps. It refuses times in the past, validates against the provider's actual open days, and holds state across messages so a half-finished booking survives an interruption.

**Cancel and reschedule by conversation**, with ownership verified server-side before anything changes.

**Autopilot.** Scheduled proactive jobs (vaccination reminders, follow-up prompts) that default to *propose-and-confirm* — the owner taps once to approve. Fully automatic booking happens only for owners who explicitly opt in.

**Self-improvement loop.** User feedback on answers and detected knowledge gaps are recorded so the knowledge base can be extended where it actually fell short.

**AI security agent.** Suspicious request patterns are classified by a model whose output is then clamped by deterministic validation — an SQL-injection signature can never be downgraded below CRITICAL regardless of what the model returns.

---

### 📅 Booking & Appointments

- Real availability derived from each provider's configured working days and hours
- Instant booking with server-side conflict prevention
- Status lifecycle: pending → confirmed → completed, with cancellation at any stage
- **Add to calendar** — a Google Calendar link and a downloadable `.ics` file (RFC 5545, with a two-hour reminder) delivered in the confirmation email; the file is protected by a signed, timing-safe token
- Reschedule notifications that name who moved the appointment, which pet it concerns, and the new time in Africa/Cairo, correctly handling daylight saving
- Email confirmations to both parties
- Guest booking for users who have not yet registered
- Africa/Cairo timezone handling throughout

### 🩺 Clinical Records

- Pet profiles: species, breed, age, weight, photos
- Medical records and vaccination history
- **Patient list for vets** showing real visit counts, last visit, and next scheduled visit — access scoped to pets the vet has actually seen
- Document upload with OCR-assisted reading

### 🛒 Marketplace

- Verified shops with product catalogues, categories, stock levels, and promotional badges
- **Bulk catalogue import from a spreadsheet** — the owner uploads the CSV that Excel or Google Sheets already exports, and the platform validates every row and shows exactly what will be created and what will be skipped *before anything is written*. Handles quoted commas, embedded newlines, Excel's byte-order mark, messy prices such as `1,200.50` and `EGP 300`, and flexible column names in English and Arabic. Duplicate detection runs both within the file and against the existing catalogue.
- Cart with stock-overflow prevention
- Checkout through Paymob, with signature-verified payment callbacks
- Product reviews with vendor replies; ratings are shown only once real customers have given them
- Paid banner campaigns with placement, duration, and admin approval
- Vendor analytics: orders, earnings, store rating

### 💬 Community

- Post feed with photos, six emoji reactions, comments, and threaded replies
- **Professional role badges** — vets, trainers, shop owners, and clinic assistants are visibly identified with their clinic or shop name in a distinct colour; pet owners deliberately carry no badge, so the badge always means something
- AI auto-moderation that soft-deletes violating posts, with a user-facing appeal that lands in the admin queue
- Spam reporting

### 🐕 Lost & Found

- Lost and found pet reports with photos and map-pinned locations
- Confidence-scored automatic matching between lost and found reports
- Community sighting reports on an active case
- Anti-spam phone reveal — contact details are released deliberately, not published
- Status tracking through to reunion

### ❤️ Adoption, Mating & Hosting

- Adoptable pet listings with structured applications
- Breeding partner matching with request and approval flow
- Pet hosting: host profiles, bookings, and host reviews

### 💌 Messaging

- Direct messaging between owners and professionals
- **Connection requests** — messages from people you have not accepted are isolated, so the inbox cannot be spammed
- Commercial accounts are blocked from sending personal connection requests
- Message reactions, deletion, and conversation clearing
- **Email notification on a new direct message and on a connection request**, naming the sender and linking straight to the conversation, with a quiet period so an active back-and-forth does not generate an email per line

### 📍 Discovery & Maps

- Nearest-first sorting by Haversine distance
- Interactive Leaflet maps of clinics, training centres, and shops
- Real nearby pet shops pulled live from OpenStreetMap via the Overpass API, with caching
- Search and filtering by specialty, category, and area

### 🎁 PulseBox & Subscriptions

- Curated subscription boxes for pet owners
- Professional subscription tiers for clinics, academies, and shops
- Admin-managed plans and pricing

### 🛡️ Administration

- Analytics dashboard with time-series metrics
- User management: search, ban, role changes, deletion
- Credential verification with uploaded documents and reviewer notes
- Content moderation queue with restore and permanent delete
- Booking, subscription, service, plan, product, and ad-banner management
- **Feature flags** — any major area (vets, marketplace, subscriptions, hosting, community, lost & found, adoption) can be switched to "coming soon" without a deployment, which is how the platform soft-launches
- Commission rate configuration
- Full audit log of every privileged action
- Database health metrics, backup, index optimisation
- AI-assisted analytics console for natural-language queries over platform data

### 🔔 Notifications

- In-app notification centre
- Transactional email over SMTP for bookings, reschedules, messages, connection requests, and verification
- SMS verification codes via Twilio, with a development fallback
- Email verification and password recovery with one-time codes

---

## 4. Technical Architecture

### Frontend
- **React 19.2** single-page application, built with **Vite 8**
- **React Router** with role-guarded routes
- **Tailwind CSS**, with a consistent design system across all dashboards
- **Leaflet** for interactive mapping
- **Axios** with centralised authentication handling
- Bilingual English/Arabic interface with right-to-left support
- SEO metadata per page

### Backend
- **Node.js** with **Express 4**, exposing a REST API of 22 route modules covering authentication, pets, providers, bookings, community, marketplace, messaging, payments, uploads, adoption, mating, hosting, clinics, AI, security, and administration
- **Vercel AI SDK** with **Zod**-validated tool schemas for the agentic layer
- **Nodemailer** for transactional email
- **Tesseract.js** for local, free OCR of uploaded identity documents — no third-party KYC service and no per-check cost
- **Twilio** for SMS
- **Multer** for uploads, with content-type sniffing rather than trusting the declared type

### Database
- **PostgreSQL** hosted on **Supabase**, with 47 tables
- Connection pooling tuned for the deployment target: a single connection per serverless instance in production, five locally — this prevents the connection exhaustion that a conventional pool causes when every request runs in its own short-lived function
- Parameterised queries throughout

### Deployment
- **Vercel**, serving the built frontend as static assets and the entire Express application as a single serverless function
- Two independent Vercel projects from one repository, each self-contained
- Real-time messaging uses **Socket.IO** where a persistent process is available; on the serverless production deployment, where no process is long-lived enough to hold a WebSocket, delivery falls back to short-interval polling so messaging works identically either way

---

## 5. Security — Defence in Depth

1. **Parameterised queries everywhere.** Every SQL statement binds its values; no user input is ever concatenated into a query.
2. **Active threat detection.** Middleware inspects incoming requests for injection signatures and blocks them before they reach a controller, with an abuse monitor tracking repeat offenders.
3. **Stateless JWT authentication.** Bearer tokens verified on every protected route, with a hardened guard against tokens that are structurally valid but semantically wrong.
4. **Ownership enforced in SQL.** Authorisation conditions live in the `WHERE` clause, so a request for another user's record returns nothing rather than relying on a check that could be skipped.
5. **Rate limiting**, layered by sensitivity:
   - General API — 500 requests per 15 minutes (configurable per environment)
   - Login — 10 attempts per 15 minutes per IP, alongside separate per-account lockout
   - Registration — 5 per 15 minutes
   - Password recovery — 10 per 15 minutes
   - Search and provider lookup — 30 per minute
6. **Helmet security headers** with a **Content Security Policy** scoped to the origins the application genuinely loads, deployed in report-only mode first so violations can be reviewed before enforcement.
7. **Signed payment webhooks.** Payment callbacks are authenticated by HMAC-SHA512 over the exact bytes received, verified *before* any database write, so an unsigned callback cannot mark an order paid.
8. **Signed calendar links** using timing-safe comparison.
9. **Upload validation** by content sniffing, with size limits.
10. **Bcrypt password hashing**, email verification, and one-time recovery codes.
11. **Audit logging** of every administrative and privileged action.
12. **AI-specific guardrails**: prompt-injection resistance, system-prompt leak prevention, and a security classifier whose output is clamped so a model can never downgrade a critical finding.

---

## 6. Engineering Practices

- **Automated test suites** — an AI evaluation harness of 141 checks covering safety guardrails in both languages, date parsing, route integrity, intent detection, and security clamping; plus a 48-check suite for spreadsheet import parsing and validation
- **Idempotent database migrations** kept in the repository
- **Feature flags** allowing progressive rollout without redeployment
- **Structured audit logging** and AI observability tables

---

## 7. Recently Delivered

Work completed in the most recent development cycle:

- Agentic AI booking with a visual slot picker, conversational cancel and reschedule, and Arabic parity across all safety guardrails
- Retrieval ranking rebuilt to weight rare terms, fixing answers that matched on common words
- Vet patient records redesigned with correct visit counts, last and next visit, and clinic identification
- "Add to calendar" for Google Calendar and any calendar app that reads `.ics`
- Reschedule notifications rewritten to state the real time, pet, and counterparty
- Email notifications for direct messages and connection requests
- Professional role badges across the community feed
- Pet-name validation that rejects sentences and interface labels being stored as names
- Pagination across long professional lists
- Bulk product import from spreadsheets, with a dry-run preview
- Product ratings corrected so unrated items are not shown as five-star
- Trainer dashboard separated from the clinic dashboard

---

## 8. Roadmap

- Dedicated shop storefronts with owner-authored profiles, stable links, and customer reporting
- Trainer programmes: multi-session courses, group classes with rosters, and per-dog progress tracking
- Clinic wallet with earnings ledger and withdrawals
- Loyalty and rewards
- Continued reduction of AI inference cost per message
