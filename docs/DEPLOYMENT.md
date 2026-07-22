# Cloudflare Pages and Neon deployment

The canonical production domain is `jbagreengoldorchard.farm`; `www.jbagreengoldorchard.farm` should redirect to the apex. The requested text contained spaces and a spelling variation, neither of which can be used as a DNS hostname.

## One-time platform setup

1. Create separate Neon projects or isolated branches for development, staging, and production. Enable point-in-time restore and retain the direct pooled connection strings for migrations.
2. Create Cloudflare Hyperdrive configurations for the staging and production Neon databases. Replace the zero placeholder IDs in `apps/api/wrangler.jsonc`. Use the Neon hostname and TLS settings Cloudflare documents for Hyperdrive.
3. Create private R2 buckets `jba-greengold-files-staging` and `jba-greengold-files-production`. Do not expose them with a public URL.
4. Create a Cloudflare Pages Direct Upload project named `jba-greengold-orchard`, with `main` as the production branch. This repository intentionally uses GitHub Actions Direct Upload; do not also connect Pages Git integration.
5. Add `jbagreengoldorchard.farm` and `www.jbagreengoldorchard.farm` under Pages custom domains. Add `staging.jbagreengoldorchard.farm` to the staging branch. Keep the DNS zone proxied through Cloudflare.
6. Create Turnstile widgets for staging and production hostnames. Configure the Worker secrets for each environment:

   ```bash
   npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/api/wrangler.jsonc --env staging
   npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/api/wrangler.jsonc --env production
   npx wrangler secret put RESEND_API_KEY --config apps/api/wrangler.jsonc --env staging
   npx wrangler secret put RESEND_API_KEY --config apps/api/wrangler.jsonc --env production
   ```

7. Verify the sending domain with the email provider before enabling password-reset email.

## GitHub environments

Create `staging` and `production` environments. In each, add secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `NEON_DATABASE_URL`; add variables `APP_URL` and `TURNSTILE_SITE_KEY`. Scope the Cloudflare token to Workers Scripts edit, Pages edit, R2 edit, Hyperdrive edit/read, and Account Settings read for this account only. Never use the Global API key.

Set production `APP_URL` to `https://jbagreengoldorchard.farm` and staging to `https://staging.jbagreengoldorchard.farm`. Require reviewers on the production environment.

## First release

1. Replace all placeholder Hyperdrive binding IDs.
2. Push the repository to GitHub and create the protected `staging` branch from `main`.
3. Merge a feature into `staging`, confirm the migration/deploy workflow succeeds, and exercise registration, login/logout, inquiry, job application upload, staff authorization, and password reset.
4. Register the intended administrator in the target environment, set `DATABASE_URL` locally to that environment's direct migration URL, and run `npm run admin:promote -- --email=...`.
5. Promote `staging` to `main` through a reviewed pull request and approve the production environment deployment.

## Release verification

Check `/api/v1/health` and `/api/v1/ready`, Cloudflare Worker errors/traces, Pages Function logs, and Neon connection/database metrics. Confirm HTTPS redirection, CSP and security headers, cache headers for hashed assets, robots/sitemap, Turnstile enforcement, R2 privacy, and that customer records cannot cross account boundaries.

## Rollback and migrations

Cloudflare retains Worker and Pages deployments, so roll back both surfaces to the previous known-good deployment from the dashboard or by redeploying a release tag. Database migrations must be additive and backward-compatible: add nullable columns/tables first, deploy compatible code, backfill, and only remove old fields in a later release. For destructive data recovery, pause deployments and restore or branch from Neon's point-in-time history; never improvise a reverse migration on production.
