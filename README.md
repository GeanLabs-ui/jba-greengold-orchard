# JBA GreenGold Orchard

Production monorepo for the public website, customer portal, staff workspace, and API.

## Architecture

- React/Vite frontend on Cloudflare Pages
- Hono API on Cloudflare Workers, reached through a Pages service binding at `/api/v1`
- Neon PostgreSQL through Cloudflare Hyperdrive
- Private application documents dual-written to primary and recovery Cloudflare R2 buckets
- HttpOnly database-backed sessions, verified Google sign-in, CSRF protection, role permissions, Turnstile, rate limits, audit logs, and structured Cloudflare Worker logs/traces

## Local development

1. Install dependencies with `npm ci`.
2. Run `npm run db:migrate` only when migrations are intentionally required.
3. Start the app with `npm run dev`. It creates the local `.env` when needed, starts the protected PostgreSQL volume, verifies a timestamped backup, and then starts both the web app and API without changing the database schema. Running only `dev:web` leaves database-backed screens offline.
4. Open `http://localhost:5173`.

Always start the Farm app from this repository root. The web server is fixed to port `5173` and will stop with a clear workspace message if another checkout is already using that port; it will not silently start on `5174` or another fallback port.

For routine work with an existing local database, use `npm run dev` (or the equivalent `npm run dev:local`). Neither command runs migrations. Run `npm run db:migrate` separately only when migrations are intentionally required. Local backups are kept outside Docker under `.backups/database`.

Run the full release gate with:

```bash
npm run check
```

On localhost, `/register` creates a local test customer with a name, email, and password of at least 12 characters. Use `/login` to sign back in. The customer and admin login pages also have separate seeded test-account buttons. `npm run dev` seeds these synthetic accounts without altering existing users; `npm run dev:seed` can run separately against the protected local database. See `docs/LOCAL_TEST_AUTH.md` for environment restrictions and verification details.

Google Sign-In is configured for staging only, as documented in `docs/STAGING_GOOGLE_SIGN_IN.md`. Do not configure Google OAuth for localhost. Outside local development, new customers use verified Google sign-up at `/register`; password registration remains disabled. Existing password accounts use `/login` for customers or `/staff-login` for staff/admin. Staff accounts cannot enter customer routes or customer checkout/payment APIs, and customers cannot enter the staff workspace. The browser obtains Google's public client ID from `/api/v1/auth/config`; never put a client secret in frontend configuration.

Account setup requires migration `0019_customer_account_setup.sql`. For an older local database, first run `npm run db:backup`, then `node --env-file=.env scripts/apply-account-schema.mjs` to apply only this additive schema. Normal startup does not migrate data.

Read-only account/data audit: `node --env-file=.env scripts/audit-accounts.mjs`. The optional PostgreSQL authentication integration test uses transaction rollback for all fixtures: in PowerShell, set `$env:AUTH_DATABASE_TEST='1'`, then run `node --env-file=.env node_modules/vitest/vitest.mjs run apps/api/src/account-isolation.integration.test.ts`. Remove that environment variable afterwards with `Remove-Item Env:AUTH_DATABASE_TEST`.

To test as an administrator locally, open `/staff-login` and choose **Log in as local test admin**. This creates an ordinary server session for the seeded administrator; customer registration never grants staff access.

Deployment and branch setup are documented in `docs/DEPLOYMENT.md` and `docs/BRANCHING.md`.

Paystack/Stripe hosted checkout, payment country coverage, and later API-key setup are documented in `docs/PAYMENTS.md`. Online payments remain disabled until explicitly configured.

Database changes are committed as ordered SQL files in `packages/database/migrations`. Applied files are checksum-locked across Windows and Linux line endings and must never be edited; add a new additive migration instead. Local checks and deployment workflows reject destructive migration statements.

`farms` and `farm_blocks` are the only active Farm/FarmBlock source of truth. The legacy `/entities/Farm` and `/entities/FarmBlock` interface is a compatibility layer over those relational tables, not a second database. See `docs/DATABASE.md`.

Set `DATABASE_URL` and run `npm run db:inspect` to print the live database's tables and columns without changing data.
