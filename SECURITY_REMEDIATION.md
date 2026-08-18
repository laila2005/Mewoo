# PetPluse — Security Remediation Report

**Responds to:** *PetPulse Consolidated Security Assessment* — Gaber Hosny, Security Layer Lead, 2026-08-17
**Remediation date:** 2026-08-18
**Scope:** the 9 findings recorded as OPEN in that report
**Result:** **9 of 9 remediated in code.** One (F-10) additionally requires a credential rotation and a git-history purge that only the repository owner can perform — see §2.

---

## 1. Summary

| ID | Finding | Severity | Status | Verified by |
| --- | --- | --- | --- | --- |
| F-10 | Hard-coded production DB credentials | CRITICAL | **Code remediated** — owner action still required | Repo-wide grep, pre-commit hook test |
| F-09 | Broken access control — `/api/bookings/all` | HIGH | **Fixed** | Live HTTP: 200 → 403 |
| F-14 | IDOR — pet data disclosure | HIGH | **Fixed** | Live HTTP: 200 → 404 |
| F-15 | Stored XSS in map components | HIGH | **Fixed** | Browser PoC: fires → does not fire |
| F-12 | CORS wildcard | MEDIUM | **Fixed** | Live header inspection |
| F-16 | CSP in Report-Only mode | MEDIUM | **Fixed** | Live header inspection |
| F-17 | Vulnerable dependencies | MEDIUM | **Fixed** | npm audit: 32 → 0 |
| AI-03 | PII in raw AI response blocks | LOW | **Fixed** | Tool output, both auth states |

Regression check after all changes: **50** slug tests, **48** CSV tests, **141** AI-eval assertions — all passing; frontend builds clean.

### Two notes on the assessment itself

- The report's F-10 remediation step ("remove the offending scripts from version control") is necessary but not sufficient on its own — deleting the files does not remove the secret from history, which the report correctly says elsewhere. Both steps are covered in §2.
- Beyond the two password-bearing files the report names, two further files contain the Supabase **project reference**. That value is public — it appears in the API URL — and is not a secret. No other credential-bearing files were found.

---

## 2. F-10 — Hard-coded Production Database Credentials · CRITICAL

**Was:** a PostgreSQL connection string carrying the `postgres` **super-user** password, in clear text, in a public repository, at HEAD and in git history.

**Done:**

- `backend/scratch/migrate_remote_db.js` and `backend/scratch/check_recoveries.js` now read `process.env.DATABASE_URL` and **exit non-zero** when it is absent — no embedded fallback remains.
- Added `.githooks/pre-commit`, which blocks any staged file containing a database URL with an inline password, or an OpenAI / Groq / AWS / JWT-shaped key. Enabled with `git config core.hooksPath .githooks` (already set in this working copy).

**Proof — the password no longer exists anywhere in the tracked tree:**

```
$ grep -rl "<exposed password>" . --exclude-dir=node_modules --exclude-dir=.git
backend/.env          # the only remaining location — git-ignored, which is correct

$ git ls-files --error-unmatch backend/.env
error: pathspec 'backend/.env' did not match any file(s) known to git    # not tracked
```

**Proof — the hook blocks a re-introduction:**

```
$ git commit        (staging a test file containing a postgres:// URL with a password)
BLOCKED: leaktest_tmp.js contains a database URL with an embedded password.

Move the value into backend/.env (git-ignored) and read it with process.env.
Override only if you are certain:  git commit --no-verify
```

> ### Two actions remain, and only you can perform them
>
> **1. Rotate the Supabase database password.** Until this is done the exposed credential remains valid, because it is still recoverable from git history and from any clone or fork already taken. Treat the current value as fully compromised, and review database logs for connections you do not recognise.
>
> **2. Purge git history, then force-push:**
>
> ```bash
> git filter-repo --path backend/scratch/migrate_remote_db.js --path backend/scratch/check_recoveries.js --invert-paths
> ```
>
> Rotate **again** afterwards, since the old value was exposed for the entire window.
>
> Both are credential and history-rewriting operations with irreversible consequences for anyone else holding a clone, so they are deliberately left to you rather than done automatically.
>
> Also recommended, per least privilege: give the application a scoped database role instead of the `postgres` super-user.

---

## 3. F-09 — Broken Access Control · HIGH

**Was:** `GET /api/bookings/all` carried `requireAuth` but no `requireAdmin`, and the controller query was unscoped. Any account of any role could read every appointment on the platform, including every owner's full name and email address.

**Done —** `backend/src/routes/bookingRoutes.js`:

```js
// F-09: this returned EVERY appointment on the platform — pet, vet, and the
// full name and email address of every owner — to any authenticated account,
// whatever its role. It is an admin report, so it now requires an admin.
router.get('/all', requireAdmin, getAllAppointments);
```

**Proof (live):**

```
non-admin owner token -> 403     (was 200 with every user's PII)
admin token           -> 200
no token              -> 401
```

---

## 4. F-14 — IDOR, Pet Data Disclosure · HIGH

**Was:** `getPetById` filtered on the pet id alone. Any authenticated user could supply any pet UUID and receive the pet record plus the owner's first name, last name and user id.

**Done —** `backend/src/controllers/petController.js` now resolves three legitimate readers and refuses everything else:

| Caller | Result |
| --- | --- |
| The pet's owner | Full record |
| An administrator | Full record (moderation) |
| Anyone, when the pet is listed for adoption or mating | Listing fields only — `owner_id`, `owner_user_id`, `owner_first_name`, `owner_last_name` stripped |
| Anyone else | `404` — indistinguishable from a pet that does not exist, so the endpoint cannot be used to confirm which UUIDs are real |

The public adoption and mating flows were deliberately preserved: `PetProfile.jsx` reads this endpoint for public listings, so a blanket ownership check would have broken adoption browsing.

**Proof (live):**

```
another user's private pet -> 404     (was 200 with owner name + id)
admin                      -> 200
publicly listed pet        -> 200, 15 fields, owner identity fields present: NONE
```

---

## 5. F-15 — Stored Cross-Site Scripting · HIGH

**Was:** five Leaflet popup sinks built HTML with template literals and assigned it to `innerHTML`, interpolating provider-controlled profile fields. A vet or trainer who set their display name to a payload achieved stored XSS that fired for every visitor to the vets list or map. The application's DOMPurify layer was bypassed entirely, and CSP (F-16) was not enforcing.

**Done:**

- New `petpulse-web/src/utils/escapeHtml.js` — `escapeHtml()` escapes `& < > " '`; `safeImageUrl()` admits only `http(s)` URLs before a value reaches a `src` attribute.
- Every interpolation in all five sinks now passes through one of them:

| File | Escaped |
| --- | --- |
| `components/common/LeafletMap.jsx` | 5 values + validated image URL |
| `pages/Vets.jsx` | 4 values + validated image URL |
| `pages/VetBooking.jsx` (2 sinks) | 8 values + validated image URL |
| `pages/Trainers.jsx` | 5 values + validated image URL |

Escaping rather than sanitizing is deliberate: these fields are names and labels, where markup is never legitimate, so escaping is the stricter control.

**Proof — both templates executed in a real browser:**

```
VULNERABLE original template : { xssFired: true,  title: "XSS-EXECUTED" }
FIXED shipped template       : { xssFired: false, title: "CLEAN-BASELINE",
                                 injectedElements: 0, payloadVisibleAsText: true }
```

The original executes attacker JavaScript and rewrites `document.title`. The shipped version injects **zero** elements and renders the payload as literal text.

**Proof — image-URL validation:**

```
javascript:alert(1)                    -> FALLBACK
data:text/html,<script>                -> FALLBACK
https://x.com/a.png" onerror="alert(1) -> FALLBACK   (attribute-break blocked)
https://x.com/a.png                    -> allowed
```

---

## 6. F-12 — CORS Wildcard · MEDIUM

**Was:** `app.use(cors())` and Socket.IO `origin: '*'`, so any website could script requests against every endpoint.

**Done:** an explicit allow-list applied to **both** Express and Socket.IO, overridable per environment through `ALLOWED_ORIGINS`, with a narrow pattern for this project's Vercel preview deployments. Requests carrying no `Origin` header — same-origin, curl, mobile webviews, health checks — continue to work.

**Proof (live):**

```
Origin: https://evil-attacker.com            -> (no Access-Control-Allow-Origin header)
Origin: https://petpulse-showcase.vercel.app -> Access-Control-Allow-Origin: https://petpulse-showcase.vercel.app
```

---

## 7. F-16 — CSP in Report-Only Mode · MEDIUM

**Was:** `const cspReportOnly = process.env.CSP_ENFORCE !== 'true'`. The policy defaulted to Report-Only, so the browser reported violations but blocked nothing — leaving F-15 without the backstop the policy was written to provide.

**Done:** the default is inverted. CSP is **enforced** unless `CSP_REPORT_ONLY=true` is set explicitly to debug a new directive.

**Proof (live):**

```
Content-Security-Policy: default-src 'self';script-src 'self' https://accounts.google.com …
```

The response now carries `Content-Security-Policy`, not `Content-Security-Policy-Report-Only`.

---

## 8. F-17 — Vulnerable Third-Party Dependencies · MEDIUM

| Package tree | Before | After |
| --- | --- | --- |
| `petpulse-web` | 19 (13 high, 5 moderate, 1 low) | **0** |
| `backend` | 13 (8 high, 4 moderate, 1 low) | **0** |

The report listed 19 for the front end; the back end carried a further 13, also now cleared. This included the **DOMPurify** advisory the report flagged as especially relevant given the application's reliance on it.

`nodemailer` required a major bump (8 → 9.0.5) for GHSA-p6gq-j5cr-w38f, where a message-level `raw` option bypasses `disableFileAccess` / `disableUrlAccess`. The application was checked and **never passes the `raw` option**, so it was not exploitable through this path; it was upgraded regardless, and `sendMail` re-verified afterwards on the new major version.

**Recommended next:** enable Dependabot, or add `npm audit` to CI, so regressions surface automatically rather than at the next assessment.

---

## 9. AI-03 — Personal Data in Raw AI Response Blocks · LOW

**Was:** `/api/ai/chat` (optional authentication) returned `owner_name` and `pet_id` inside `mating_match` and adoption blocks to **any** caller, authenticated or not. This is precisely what made F-14 exploitable with no account at all — the report correctly identified the two as a chain.

**Done —** in `backend/src/ai/tools.js`, for both `findMatingPartners` and `findAdoptablePets`:

- `owner_name` — **removed entirely.** It is personal data the UI never rendered.
- `pet_id` — returned **only to signed-in callers.** The propose-match action needs it and already requires a login, so the feature is preserved while anonymous UUID harvesting is closed.

**Proof:**

```
ANONYMOUS  fields: name, species, breed, age_years, gender, bio, location, avatar_url
           owner_name: false | pet_id: false
SIGNED IN  fields: pet_id, name, species, breed, age_years, gender, bio, location, avatar_url
           owner_name: false | pet_id: true
```

The chain is now broken at both ends: even where a `pet_id` is legitimately obtained, F-14 prevents it from yielding owner PII.

---

## 10. Regression Evidence

```
shopSlug   : 50 passed, 0 failed
csvImport  : 48 passed, 0 failed
AI eval    : 141 passed, 0 failed, 3 skipped
frontend   : build succeeded
backend    : all modules load; email send re-verified on nodemailer 9.0.5
```

---

## 11. Outstanding

| Item | Owner | Why it was not automated |
| --- | --- | --- |
| Rotate the Supabase database password | Repository owner | Credential operation in the Supabase dashboard |
| Purge git history and force-push | Repository owner | Rewrites shared history; invalidates every existing clone |
| Move the application off the `postgres` super-user to a scoped role | Repository owner | Requires provisioning a new database role |
| Enable Dependabot / `npm audit` in CI | Repository owner | Repository settings |

Until the first two are complete, **F-10 should be considered mitigated in code but not closed.**
