# Database architecture

The application uses one PostgreSQL database per environment: local PostgreSQL for development and Neon PostgreSQL for staging/production. Cloudflare Hyperdrive is a connection accelerator for that same database, not another datastore.

## Farm source of truth

- `farms` stores farm identity, location, status, and declared capacity.
- `farm_blocks` stores every block and its Daily Routine Check operational fields.
- normalized inventory, yield, harvest-period, activity-period, status-history, and merge tables reference those ids with foreign keys.
- `/api/v1/farms` is the primary relational API.
- `/api/v1/entities/Farm` and `/api/v1/entities/FarmBlock` are backward-compatible routes over the same tables for older screens. They do not read or write `entity_records` for these two entity names.

Historical Farm/FarmBlock rows in `entity_records` are inert rollback snapshots after migration `0010`; other legacy entity types continue to use that generic table within the same PostgreSQL database.

## Automatic updates

Every schema change is a new ordered SQL file under `packages/database/migrations`. On pushes to `staging` or `main`, GitHub Actions:

1. verifies the Neon URL, Hyperdrive id, Worker name, and Pages service binding;
2. runs the full code release gate;
3. applies pending checksum-locked migrations to Neon;
4. deploys the API and web app;
5. calls the public health endpoint.

Never edit a migration after it has been applied. Add a new additive migration so staging and production update safely and repeatably.

## Local Docker database

The only runtime local database is the Compose service in the repository root. Its container is managed by `docker compose`, its volume is `farmactualproject_mango_farm_postgres_data`, and the application connects to `127.0.0.1:55432/mango_farm` through `DATABASE_URL`.

If data must be recovered from an older local PostgreSQL instance, expose that instance on a temporary port, take backups of both databases, and run `npm run db:consolidate:local` with `LEGACY_DATABASE_URL` set. The consolidation is deliberately selective: it preserves users, customer/order/inquiry/application records, uploaded-file metadata, audit history, custom Master Schedule work, and recorded milestone progress without duplicating the seeded programme or Farm/FarmBlock rows.
