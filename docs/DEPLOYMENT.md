# Cloudflare Pages and Neon deployment

The canonical production domain is `jbagreengoldorchard.farm`; `www.jbagreengoldorchard.farm` should redirect to the apex. The requested text contained spaces and a spelling variation, neither of which can be used as a DNS hostname.

## One-time platform setup

1. Create separate Neon projects for staging and production. Do not use two schemas or branches in one database as the environment boundary. Enable the plan's point-in-time restore/backup history and retain a direct connection string for migrations in each GitHub environment.
2. Create Cloudflare Hyperdrive configurations for the staging and production Neon databases. Replace the zero placeholder IDs in `apps/api/wrangler.jsonc`. Use the Neon hostname and TLS settings Cloudflare documents for Hyperdrive.
3. Enable R2 and create four private buckets: `jba-greengold-files-staging`, `jba-greengold-files-staging-backup`, `jba-greengold-files-production`, and `jba-greengold-files-production-backup`. Do not expose them with a public URL. Apply a retention lock to each backup bucket after testing the failed-upload cleanup path. The API dual-writes immutable UUID-keyed files and reads from the backup if the primary copy is missing.
4. Create a Cloudflare Pages Direct Upload project named `jba-greengold-orchard`, with `main` as the production branch. This repository intentionally uses GitHub Actions Direct Upload; do not also connect Pages Git integration.
5. Add `jbagreengoldorchard.farm` and `www.jbagreengoldorchard.farm` under Pages custom domains. Add `staging.jbagreengoldorchard.farm` to the staging branch. Keep the DNS zone proxied through Cloudflare.
6. Create separate Turnstile widgets for the staging and production hostnames. The deployment workflows synchronize `TURNSTILE_SECRET_KEY` from the matching GitHub environment to the matching Worker. Do not reuse production keys in staging.

7. In Google Cloud Console, create separate OAuth 2.0 Web client IDs for staging and production. Add only the matching authorized JavaScript origins (`https://staging.jbagreengoldorchard.farm` for staging; the apex and `www` origins for production). No redirect URI is required for the Google Identity Services ID-token flow. Store each public client ID as that GitHub environment's `GOOGLE_CLIENT_ID` variable.

8. If transactional email is enabled, configure the optional Worker secret for each environment:

   ```bash
   npx wrangler secret put RESEND_API_KEY --config apps/api/wrangler.jsonc --env staging
   npx wrangler secret put RESEND_API_KEY --config apps/api/wrangler.jsonc --env production
   ```

9. Verify the sending domain with the email provider before enabling password-reset email.

10. Enable Cloudflare managed WAF rules for the zone. Add a zone-level rate rule for repeated requests to `/api/v1/auth/*`, `/api/v1/applications`, and public inquiry endpoints; retain the application-level database rate limits as the authoritative fallback. Start in log mode, review staging traffic, and then block/challenge abusive traffic.

11. Use Cloudflare Worker Logs, traces, metrics, and error notifications as the error-monitoring service. Staging traces are sampled at 100%; production traces at 10% while request and error logs remain enabled. An external Sentry destination can be added later without changing the request path.

## GitHub environments

Create `staging` and `production` environments. In each, add secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NEON_DATABASE_URL`, and `TURNSTILE_SECRET_KEY`; add variables `APP_URL`, `TURNSTILE_SITE_KEY`, and `GOOGLE_CLIENT_ID`. Scope the Cloudflare token to Workers Scripts edit, Pages edit, R2 edit, Hyperdrive read, and Account Settings read for this account only. Never use the Global API key.

Set production `APP_URL` to `https://jbagreengoldorchard.farm` and staging to `https://staging.jbagreengoldorchard.farm`. Require reviewers on the production environment.

Restrict `staging` deployments to `staging` and production deployments to `main`. Require an explicit approval on the production environment. Branch rules must require pull requests, `verify` and `analyze` checks, resolved conversations, and block force pushes/deletions.

## First release

> ⚠️ **Production blocker**: The production Hyperdrive binding in `apps/api/wrangler.jsonc` env `production` still has the zero-placeholder ID (`00000000000000000000000000000000`). Replace it with the real Hyperdrive configuration ID **before any production deploy**. Deploying with the placeholder will cause a database connection error on every API request.

1. Replace the production placeholder Hyperdrive binding ID and confirm the existing staging ID points only to the staging Neon project.
2. Push the repository to GitHub and create the protected `staging` branch from `main`.
3. Merge a feature into `staging`, confirm the migration/deploy workflow succeeds, and exercise registration, password and Google login/logout, Turnstile forms, inquiry, file upload plus recovery fallback, staff authorization, and password reset.
4. Register the intended administrator in the target environment, set `DATABASE_URL` locally to that environment's direct migration URL, and run `npm run admin:promote -- --email=...`.
5. Promote the exact tested `staging` tree to `main` through a reviewed pull request and approve the production environment deployment. The production workflow rejects a `main` tree that differs from `staging`.

## Release verification

The deployment workflows require the frontend, `/api/v1/health`, and database-backed `/api/v1/ready` to pass. Also inspect Cloudflare Worker errors/traces and Neon metrics. Confirm HTTPS redirection, CSP/security headers, cache headers, Turnstile enforcement, Google token verification, R2 privacy/recovery, WAF activity, and that customer records cannot cross account boundaries.

## Rollback and migrations

Cloudflare retains Worker and Pages deployments, so roll back both surfaces to the previous known-good deployment from the dashboard or by redeploying a release tag. Database migrations must be additive and backward-compatible: add nullable columns/tables first, deploy compatible code, backfill, and only remove old fields in a later release. For destructive data recovery, pause deployments and restore or branch from Neon's point-in-time history; never improvise a reverse migration on production. Test a Neon restore and an R2 backup read in staging before the first production approval and quarterly thereafter.
