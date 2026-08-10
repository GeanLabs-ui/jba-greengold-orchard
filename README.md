# JBA GreenGold Orchard

Production monorepo for the public website, customer portal, staff workspace, and API.

## Architecture

- React/Vite frontend on Cloudflare Pages
- Hono API on Cloudflare Workers, reached through a Pages service binding at `/api/v1`
- Neon PostgreSQL through Cloudflare Hyperdrive
- Private application documents dual-written to primary and recovery Cloudflare R2 buckets
- HttpOnly database-backed sessions, verified Google sign-in, CSRF protection, role permissions, Turnstile, rate limits, audit logs, and structured Cloudflare Worker logs/traces

## Local development

1. Copy `.env.example` to `.env`.
2. Start the local PostgreSQL database with `docker compose up -d --wait`.
3. Run `npm ci`, `npm run db:migrate`, and `npm run dev`. The last command starts both the web app and API; running only `dev:web` leaves database-backed screens offline.
4. Open `http://localhost:5173`.

Run the full release gate with:

```bash
npm run check
```

The first local administrator is created by registering normally and then running:

```bash
npm run admin:promote -- --email=admin@example.com
```

Deployment and branch setup are documented in `docs/DEPLOYMENT.md` and `docs/BRANCHING.md`.

Database changes are committed as ordered SQL files in `packages/database/migrations`. Applied files are checksum-locked and must never be edited; add a new migration instead.

`farms` and `farm_blocks` are the only active Farm/FarmBlock source of truth. The legacy `/entities/Farm` and `/entities/FarmBlock` interface is a compatibility layer over those relational tables, not a second database. See `docs/DATABASE.md`.

Set `DATABASE_URL` and run `npm run db:inspect` to print the live database's tables and columns without changing data.
