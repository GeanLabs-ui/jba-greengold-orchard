# October 2026 operational field storage

Inventory uses `Equipment`, harvesting uses `HarvestBatch`, Issues uses `Issue`, and objective cycles use `ObjectiveCycle` in the existing PostgreSQL `entity_records.data` JSONB column. Daily Task Log objective links remain on `DailyActivity` records. JSONB retains new fields without adding individual SQL columns or replacing old records. No new schema migration is required for these fields.

The generic entity API merges patches with `data || payload`, retaining keys absent from an update. Issue reporting now uses that API in deployed builds, with role checks, CSRF protection and audit events. Local preview records are never imported by deployment. Existing attachment identifiers and metadata survive edits; new deployed attachments use the private file service, which writes to primary and recovery R2 buckets. Deployed uploads are limited to the existing 5 MB service limit.

Release validation runs the non-destructive migration guard, captures encrypted before/after snapshots of business tables, and verifies every baseline row remains intact. New audit/notification rows may be added. Ephemeral authentication and maintenance state and migration bookkeeping are excluded. A concurrent business edit can cause the comparison to fail and requires inspection; the audit never overwrites live data.

`scripts/verify-release-field-storage.mjs` checks inventory, harvest, issue, objective and task-log field round trips in a temporary clone of the live PostgreSQL entity table. It verifies JSON merge behavior, zero values and nested fields without inserting fixtures into live business tables. API tests additionally check permission/CSRF denial, field persistence, audit writes and preservation of existing notes/attachment references.

Rollback redeploys the previous API/Pages release. No database reset, destructive migration, data import or reverse migration is part of this release.
