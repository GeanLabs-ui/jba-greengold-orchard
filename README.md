# Mango Farm Platform

Standalone React/Vite application for the public website, customer portal, and staff/admin workspace.

The app now runs without a Base44 backend. Authentication and demo business records are stored locally in the browser with `localStorage`, so development can continue independently.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Admin Access

Open `/admin` directly. If no local account exists yet, register a new account first. The first registered account is automatically assigned the `admin` role; later accounts default to `user`.

Local data is stored in browser storage under keys starting with `mango_farm_local`.

## Build

```bash
npm run build
```
