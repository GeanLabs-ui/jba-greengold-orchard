# AGENTS.md

## Project Context

This is now a standalone Mango Farm React/Vite app. It was originally exported from Base44, but runtime development should not depend on Base44 services, the Base44 SDK, or the Base44 Vite plugin.

Start with `README.md` for local setup.

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: local browser-backed data/auth adapter. It preserves the previous `base44.entities.*` call shape while storing data in `localStorage`.
- `base44/entities/`: exported entity schema references only.
- `vite.config.js`: standard Vite + React config.

## Working Notes

- Use `npm run dev` for local development.
- Use `npm run build` before finishing code changes.
- Do not reintroduce Base44 runtime dependencies unless the project owner explicitly asks to reconnect the app.
