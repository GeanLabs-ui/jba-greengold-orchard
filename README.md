# JBA GreenGold Orchard

Production monorepo for the public website, customer portal, staff workspace, and API.

## Architecture

- React/Vite frontend on Cloudflare Pages
- Hono API on Cloudflare Workers, reached through a Pages service binding at `/api/v1`
- Neon PostgreSQL through Cloudflare Hyperdrive
- Private application documents in Cloudflare R2
- HttpOnly database-backed sessions, CSRF protection, role permissions, Turnstile, rate limits, audit logs, and structured Worker logs

## Local development

1. Copy `.env.example` to `.env` and set a Neon development `DATABASE_URL`.
2. Put Worker-only local values in `apps/api/.dev.vars`.
3. Run `npm ci`, `npm run db:migrate`, and then run `npm run dev:web` and `npm run dev:api` in separate terminals.
4. Open `http://localhost:5173`.

Run the full release gate with:

```bash
npm run check
```

The first administrator is created by registering normally and then running:

```bash
npm run admin:promote -- --email=admin@example.com
```

Deployment and branch setup are documented in `docs/DEPLOYMENT.md` and `docs/BRANCHING.md`.

Database changes are committed as ordered SQL files in `packages/database/migrations`. Applied files are checksum-locked and must never be edited; add a new migration instead.
