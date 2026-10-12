# Remediation Plan — Mango Farm Platform (Farm Actual Project)

## Context

A full-stack read-only review (frontend, API, database, auth, infra/CI-CD, and ops) was just completed across `apps/web`, `apps/api`, `packages/database`, `packages/authorization`, and the deployment/CI configuration. The review cross-checked the codebase against the repo's own `PRODUCTION_READINESS_AUDIT.md` (2026-07-22) and found it largely accurate, but surfaced a handful of concrete, verified gaps — one production-blocking, one real IDOR-class security gap, one CI/CD enforcement gap, and several lower-severity hygiene/consistency issues.

This plan turns those findings into discrete, independently-approvable work items. **Nothing has been implemented yet** — this document is for your review so you can decide what to greenlight and in what order. Each item lists: what's wrong, why it matters, the concrete fix, the files it touches, the risk of making the change, and how to verify it afterward. Items are grouped by urgency, not by the original 14-category list, since that's the order you'd actually want to tackle them in.

---

## Group A — Production blockers (must fix before any production deploy)

### A1. Production Hyperdrive ID is still a placeholder
**Problem:** `apps/api/wrangler.jsonc` line ~73, inside `env.production`, has `"id": "00000000000000000000000000000000"` — an unset placeholder. Staging (line ~50) has a real ID. If production is deployed as-is, every DB-touching API request fails at runtime (registration, login, all entity CRUD, everything).

**Fix:**
1. In the Cloudflare dashboard (or via `wrangler hyperdrive create`), create a Hyperdrive config pointing at the **production** Neon connection string (separate from staging's).
2. Replace the placeholder `id` in `apps/api/wrangler.jsonc` under `env.production.hyperdrive[0].id` with the real ID returned.
3. This is a one-line config change, not a code change.

**Risk:** Low — config-only, no logic touched. The risk is *not* doing it (broken prod).

**Verify:** `wrangler deploy --config apps/api/wrangler.jsonc --env production --dry-run` should succeed (already done in CI today, but dry-run doesn't catch a wrong/unreachable ID — the real check is hitting `/api/v1/ready` after a real staging-mirrored deploy, since `/ready` runs `SELECT 1` against the DB per `apps/api/src/index.ts`).

---

### A2. GitHub branch protection / required reviewers isn't actually enforced
**Problem:** `docs/BRANCHING.md` (and `docs/OPERATIONS.md`) both state GitHub rejected branch protection and required environment reviewers because the repo is private on the GitHub Free plan. Today, the `production` GitHub Environment referenced in `.github/workflows/deploy-production.yml:17` has no real approval gate — anyone with push access to `main` triggers an unattended production deploy **and migration run** (`deploy-production.yml:30-33` runs `npm run db:migrate` against `secrets.NEON_DATABASE_URL` before the deploy, with no human checkpoint in between).

**Fix (business decision, not code):**
1. Upgrade the GitHub repository/account to a plan that supports private-repo branch protection + required environment reviewers (GitHub Team or Pro).
2. Apply the ruleset `docs/BRANCHING.md:20` already specifies: require PRs, ≥1 review, CODEOWNERS review on security/infra paths, required status checks (`verify`, `analyze`), resolved conversations, block force-push/deletion.
3. Add ≥1 required reviewer to the `production` GitHub Environment so `deploy-production.yml` pauses for a human before running.
4. Optionally add a second CODEOWNER/maintainer — right now `.github/CODEOWNERS` lists a single individual, so there's no independent review path even once protection is on.

**Risk:** None to the codebase — this is entirely GitHub repo settings, no files change.

**Verify:** Push a throwaway branch/PR and confirm the required checks and reviewer gate actually block merge; confirm a manual `workflow_dispatch` or push to `main` now waits on environment approval before deploying.

---

## Group B — Real security gap (fix before multi-tenant use, recommended before production either way)

### B1. File-download route has no organization/ownership scoping (cross-tenant IDOR)
**Problem:** `apps/api/src/modules/files.ts:21-36`. The `GET /:id` file-download route *is* correctly gated by `requireRole('super_admin','admin','farm_manager','farm_supervisor','hr_officer')` (verified directly in `middleware/auth.ts:90-95` — Hono chains the two separately-registered `.get()` calls correctly, so this isn't dead code as one of my research passes initially suspected). But unlike every other resource in the API — `entity_records` is scoped by `organization_id` in `entities.ts:120,216,235`, and `owner_user_id` for customers — the file query at `files.ts:26` has **no organization or ownership filter at all**:
```
SELECT object_key, original_name, content_type, status FROM file_objects WHERE id = ${c.req.param('id')} LIMIT 1
```
Any user holding one of those five roles can download *any* file by UUID — including another organization's HR resumes/cover letters (`applications.ts` uploads flow through the same `file_objects` table). Low severity today only because the app is effectively single-tenant in practice and UUIDs are unguessable; it becomes a real cross-tenant data leak the moment a second organization is onboarded.

**Root cause:** `file_objects` (schema.ts:74-84) has no `organization_id` column — only `owner_user_id` and `record_id`.

**Fix (additive, backward-compatible):**
1. **New migration** `packages/database/migrations/0005_file_objects_organization.sql`: `ALTER TABLE file_objects ADD COLUMN organization_id text REFERENCES organizations(id) ON DELETE SET NULL;` plus an index. Additive-only, matches the project's existing migration discipline (every migration reviewed was additive-only, no destructive statements found).
2. In `apps/api/src/modules/files.ts` upload handler (`POST /`, line 38-60): populate `organization_id` from `c.get('user')!.organizationId` at insert time (that value is already available on every authenticated request via `middleware/auth.ts:60-67`).
3. In the download handler (`GET /:id`, line 23-36): add `AND organization_id IS NOT DISTINCT FROM ${c.get('user')!.organizationId}` to the `WHERE` clause for non-`super_admin`/`admin` roles, mirroring the exact pattern already used in `entities.ts:120,216`. `super_admin`/`admin` keep unrestricted access (cross-org visibility is their job, same precedent as `entities.ts:118-122`).
4. **Backfill for existing rows:** existing `file_objects` rows will have `organization_id = NULL` after the migration. Since `IS NOT DISTINCT FROM` treats `NULL = NULL` as true, old files stay visible to same-org users only if we also backfill `organization_id` from the uploader's org via a one-time `UPDATE ... FROM organization_members` join in the same migration (safe, no data loss, purely a metadata fill). This avoids silently breaking access to already-uploaded documents.

**Risk:** Low-medium. It's an additive column + a `WHERE` clause tightening, not a rewrite. The main risk is the backfill step needing to correctly join `owner_user_id → organization_members.user_id → organization_id`; if an uploader has since left their org or the membership row was deleted, that file's `organization_id` stays NULL and becomes admin-only visible (fails safe, not open) — worth flagging as an edge case to check in staging before production.

**Verify:** In staging — (a) upload a file as an org-A `farm_manager`, confirm an org-B `farm_manager` gets 404 on download by ID; (b) confirm `super_admin` can still fetch cross-org; (c) confirm pre-existing (pre-migration) files are still downloadable by their original org after backfill.

---

## Group C — CI/CD and repo hygiene (safe, low-risk, do anytime)

### C1. Tracked `.wrangler` build artifacts despite `.gitignore`
**Problem:** `.gitignore:20` lists `.wrangler/`, but `git ls-files apps/api/.wrangler/` (confirmed directly) still returns 6 tracked files under `apps/api/.wrangler/tmp/bundle-cM1804/*` and `apps/api/.wrangler/tmp/dev-0L8pWn/*`. These were committed before the ignore rule existed (`.gitignore` doesn't retroactively untrack already-committed paths) — this is exactly why your current `git status` shows them as locally "deleted" (they're gone from your working copy but still present in the git index/history).

**Fix:** `git rm --cached apps/api/.wrangler/tmp/bundle-cM1804/checked-fetch.js apps/api/.wrangler/tmp/bundle-cM1804/middleware-insertion-facade.js apps/api/.wrangler/tmp/bundle-cM1804/middleware-loader.entry.ts apps/api/.wrangler/tmp/bundle-cM1804/strip-cf-connecting-ip-header.js apps/api/.wrangler/tmp/dev-0L8pWn/index.js apps/api/.wrangler/tmp/dev-0L8pWn/index.js.map`, then commit. This only removes them from *future* tracking — it does not rewrite history (no force-push, no `filter-repo` needed, since these are build artifacts not secrets).

**Risk:** None — purely removes noise from the working tree going forward; already reflected in your working directory (git status already shows them deleted locally).

**Verify:** `git status` shows no more `.wrangler` deletions pending; a fresh `git clone` no longer contains those files under `apps/api/.wrangler`.

### C2. `base44-app/` — ~786 MB duplicate nested project sitting in the repo root
**Problem:** `base44-app/` contains a full duplicate of this project — its own `.git`, `.wrangler`, `node_modules` (533 MB), `dist`, `output/playwright` screenshots, log files. It's currently untracked (`git ls-files` confirms nothing under it is in the index), so it's harmless *today*, but it's a live risk: an errant `git add -A`, a changed `.gitignore`, or a teammate not knowing it's disposable could commit hundreds of MB of stale duplicate code, build output, or logs into history (which is expensive to undo — full history rewrite).

**Fix:** Move it outside the repository working tree entirely (e.g., to a sibling folder like `..\base44-app-archive` or wherever you keep old project snapshots), rather than deleting outright, in case it holds anything not yet ported to `apps/`. Since it's untracked, this is a plain filesystem move — no git operation needed at all.

**Risk:** None to git history (it was never tracked). The only risk is human — confirm nothing in `base44-app/` is still the source of truth for anything before moving it (worth a quick diff-by-eye against `apps/web/src` and `apps/api/src`, which the review already sampled and found to be an earlier/superseded copy).

**Verify:** `git status` no longer lists `base44-app` as untracked; repo working tree size drops by ~786 MB.

### C3. Automatic rollback on failed production smoke test
**Problem:** `.github/workflows/deploy-production.yml:50-51` runs a smoke test *after* both the API and Pages deploys, but nothing consumes a failure — if `/api/v1/health` doesn't respond, the workflow just goes red; the bad deploy stays live in production.

**Fix:** Add a rollback step that only runs `if: failure()` after the smoke-test step, calling `wrangler rollback --config apps/api/wrangler.jsonc --env production` (Wrangler supports rolling back to the previous Worker version) and the equivalent Pages rollback (`wrangler pages deployment list` + redeploy previous, or Cloudflare's Pages rollback API). This is additive to the existing workflow file — no existing steps change, only a new conditional step appended.

**Risk:** Low — a new workflow step, doesn't touch application code, easy to test on `deploy-staging.yml` first (recommend prototyping there before touching production).

**Verify:** Deliberately break staging health check in a throwaway branch (e.g., temporarily point `APP_URL` at a bad path via `workflow_dispatch` input, not by editing the real health route) and confirm the rollback step fires and staging returns to the previous good state.

---

## Group D — Correctness / drift cleanup (lower urgency, safe to schedule whenever)

### D1. Audit doc claims PBKDF2, code actually uses bcrypt
**Problem:** `PRODUCTION_READINESS_AUDIT.md` claims "PBKDF2 passwords." Actual registration/login/reset code (`apps/api/src/modules/auth.ts:82,112,176`) uses Postgres `pgcrypto` bcrypt (`crypt(password, gen_salt('bf', 12))`). The PBKDF2 implementation in `apps/api/src/security.ts:29-46` is real, working code — but it's only ever called from `security.test.ts`, never from the live auth flow. bcrypt-12 is a fine choice on its own merits; the problem is purely that documentation and dead code disagree with reality.

**Fix:** Two independent, non-conflicting choices — pick one or both:
- Update `PRODUCTION_READINESS_AUDIT.md` row 4 to say "bcrypt (cost 12, via pgcrypto)" instead of "PBKDF2."
- Delete the unused `hashPassword`/`verifyPassword` PBKDF2 functions from `security.ts` (and their test) if you're confident bcrypt is the permanent choice, since dead crypto code is a maintenance/confusion liability. Keep them only if there's a near-term plan to migrate off `pgcrypto` bcrypt (e.g., moving hashing into Worker JS instead of Postgres).

**Risk:** None for the doc update. For deleting the dead code: verify nothing else imports those two functions first (a plain grep) before removing.

**Verify:** `npm run test` still passes after either change (removing the PBKDF2 test alongside the functions, or leaving both untouched if you choose to keep them).

### D2. `packages/authorization` (`hasPermission`/`requirePermission`) is unused, coarser-grained dead code
**Correction from the initial review:** further inspection shows this isn't two *live* competing RBAC systems in tension — `requirePermission()` (`middleware/auth.ts:97-102`) is never called anywhere in `apps/api/src` (confirmed by direct grep). The only RBAC actually enforced today is the fine-grained per-entity allowlist in `entities.ts:23-46` (`ROLE_READ_ENTITIES`/`ROLE_WRITE_ENTITIES`). `packages/authorization`'s permission model (`farms.read`, `inventory.adjust`, `roles.assign`, etc.) is a *different, coarser* shape — capability-level, not entity-level — and doesn't even have entries for many of the 65 entity names, so it's not a drop-in replacement.

**Fix — pick one path, both are low-risk since neither touches live behavior:**
- **Option 1 (recommended, minimal):** Leave `packages/authorization` as-is but add a short comment at the top of `permissions.ts` clarifying it's not currently wired into any route, to stop a future engineer from assuming it's the active authorization layer.
- **Option 2:** If there's a real near-term plan to use coarse capability checks (e.g., for a future admin settings UI), wire `requirePermission()` into 1-2 real routes as a pilot and keep both systems documented as serving different purposes (entity-CRUD gating vs. capability gating).
- **Not recommended:** forcing a full merge into one system — the two models don't map 1:1 today, and forcing it risks introducing authorization bugs in the one system that actually protects data right now (`entities.ts`).

**Risk:** Essentially none for Option 1 (comment-only). Option 2 carries normal new-route testing risk, scoped to whichever route you pilot it on.

### D3. `promote-admin.mjs` grants `super_admin` with no audit trail
**Problem:** `scripts/promote-admin.mjs:12` runs a direct `UPDATE users SET role = 'super_admin' ...` with no corresponding insert into the app's own `audit_events` table. A privilege escalation performed via this script leaves no trace in the app's own audit log (only in Neon's own query logs, if enabled).

**Fix:** Add an `INSERT INTO audit_events (id, user_id, action, target_table, record_id, ...) VALUES (...)` inside the same script, using the promoted user's own `id` as both actor and target (since this is a CLI-run action, there's no separate "admin who ran it" identity unless you also thread through an operator email/note via a new `--by=` CLI arg — recommend adding that for real traceability). Wrap both statements in a transaction so a failed audit insert doesn't leave an ungranted-but-partial state.

**Risk:** Low — additive to a small, rarely-run operational script. Test against a scratch/staging database first.

**Verify:** Run against staging DB, confirm `audit_events` gets a new row alongside the role change.

### D4. Rate limiting gaps: calendar ICS feed and generic entity `list`/`GET` routes
**Problem:** Every other public-facing write endpoint (register, login, password-reset, Inquiry creation, career applications, checkout) is rate-limited via `checkRateLimit()` (`apps/api/src/rate-limit.ts:10-35`). The calendar ICS feed (`apps/api/src/modules/calendar.ts`) and generic entity list/read routes are not, relying entirely on future Cloudflare WAF rate rules that aren't configured yet.

**Fix:** Reuse the existing `checkRateLimit(sql, action, identity, limit, windowSeconds)` helper (already imported elsewhere, e.g. `applications.ts:5`) in the calendar route, keyed by the calendar token or `requestIp()`. For generic entity GET/list routes, a lighter per-IP+role window is enough to blunt scraping without hurting legitimate dashboard polling — a generous limit (e.g. 120/min) is a safe starting point.

**Risk:** Low — same well-tested helper already used in five other places, just a new call site. Main risk is picking a limit that's too tight and breaks legitimate admin dashboard polling — recommend starting generous and tightening based on staging telemetry.

**Verify:** Hit the calendar endpoint and a list endpoint past the new limit in staging, confirm `429` + `Retry-After`, confirm normal usage patterns stay under the limit.

### D5. Frontend client-side pagination/filter cap (250 records)
**Problem:** `apps/web/src/api/base44Client.js`'s `filter()` calls `list()` capped at 250 rows then filters in-memory in the browser (confirmed pattern also used by `AdminSidebar.jsx:73-76`, `AdminTopbar.jsx:32` for badge counts). Once any entity type exceeds 250 rows, filtered views and dashboard counts silently truncate rather than erroring — a correctness bug that will appear as "missing data" reports from users, not a crash.

**Fix:** This is the largest item in the plan and the one most worth scoping separately before committing to it — it likely means adding server-side filter query params to `apps/api/src/modules/entities.ts`'s list handler (it already takes `limit`/`offset`, per the earlier review) and updating `base44Client.js`'s `filter()` to pass filter criteria through to the server instead of fetching-then-filtering. Recommend treating this as its own follow-up plan once you decide it's a priority, rather than folding it into this remediation pass — it touches both API query logic and every admin page that calls `.filter()`.

**Risk:** Medium — genuine behavior change across many call sites, needs its own scoped design pass.

### D6. Minor content bug — Contact page map
**Problem:** `apps/web/src/pages/public/Contact.jsx` embeds an OpenStreetMap iframe centered on Uganda coordinates while the listed business address text says Accra, Ghana.

**Fix:** Replace the iframe's bbox coordinates with ones centered on the real Accra, Ghana address.

**Risk:** None — content-only, single file.

---

## Suggested sequencing

1. **A1** (Hyperdrive ID) and **B1** (file IDOR) first — both are concrete, scoped, and either blocking or security-relevant.
2. **C1–C3** any time — zero-risk hygiene, can run in parallel with anything else.
3. **A2** (GitHub plan upgrade) — a business/billing decision on your side; flag it now so it's not a surprise gate right before launch.
4. **D1–D4** — cheap correctness/consistency fixes, batch them together in one pass.
5. **D5** — scope as its own follow-up plan when you're ready to tackle it; don't bundle into this pass.
6. **D6** — whenever, trivial.

## Verification approach across the board
- Every code-touching item above (A1, B1, C3, D1, D3, D4, D6) should land on a feature branch, go through the existing CI pipeline (`ci.yml` — lint, typecheck, test, build, migration idempotency check, `wrangler --dry-run`) unchanged, then be validated on **staging** before touching `main`/production, consistent with the flow already documented in `docs/BRANCHING.md`.
- B1 specifically needs a manual cross-org access test in staging (two test orgs, two test users) since that's the exact scenario the fix addresses and CI won't catch it automatically.
- Nothing in this plan requires new infrastructure, new dependencies, or a new environment — every fix uses patterns and helpers already present in the codebase (`checkRateLimit`, the `organization_id IS NOT DISTINCT FROM` scoping pattern, the existing migration runner).
