-- Extends the dormant relational farms/farm_blocks tables (created in 0000_redundant_plazm.sql
-- but never used by any API code) so the new /api/v1/farms module can own this domain with real
-- foreign keys, uniqueness, and check constraints. entity_records rows for 'Farm'/'FarmBlock' are
-- left untouched by this and all following migrations -- see 0007 for the backfill and
-- apps/api/src/modules/farms.ts for why the two stores intentionally coexist.

ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "users"("id") ON DELETE set null;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "users"("id") ON DELETE set null;
ALTER TABLE "farms" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "farms" ADD CONSTRAINT "farms_status_check" CHECK ("status" IN ('active', 'inactive', 'archived'));
CREATE INDEX IF NOT EXISTS "farms_status_idx" ON "farms" ("status");
CREATE INDEX IF NOT EXISTS "farms_organization_idx" ON "farms" ("organization_id");

ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade;
ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "merged_into_block_id" text REFERENCES "farm_blocks"("id");
ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "merge_effective_date" date;
ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "created_by" text REFERENCES "users"("id") ON DELETE set null;
ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "updated_by" text REFERENCES "users"("id") ON DELETE set null;
ALTER TABLE "farm_blocks" ALTER COLUMN "status" SET DEFAULT 'active';
ALTER TABLE "farm_blocks" ADD CONSTRAINT "farm_blocks_status_check" CHECK ("status" IN ('active', 'inactive', 'merged', 'archived'));
CREATE INDEX IF NOT EXISTS "farm_blocks_farm_id_idx" ON "farm_blocks" ("farm_id");
CREATE INDEX IF NOT EXISTS "farm_blocks_status_idx" ON "farm_blocks" ("status");
-- Block codes are unique per farm, not globally. The legacy JSONB data has no such
-- guarantee, so 0007's backfill de-duplicates any existing collisions before this can
-- be relied on for new writes.
CREATE UNIQUE INDEX IF NOT EXISTS "farm_blocks_farm_id_block_code_idx" ON "farm_blocks" ("farm_id", "block_code");

-- Normalized crop variety lookup (replaces reliance on farm_blocks.variety, a legacy
-- single-text column kept in place but no longer written to by new code).
CREATE TABLE IF NOT EXISTS "crop_varieties" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "name" text NOT NULL,
  "code" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "crop_varieties_org_name_idx" ON "crop_varieties" ("organization_id", "name");

-- Normalized block <-> variety tree inventory, effective-dated so history is append-only.
CREATE TABLE IF NOT EXISTS "block_crop_inventories" (
  "id" text PRIMARY KEY NOT NULL,
  "block_id" text NOT NULL REFERENCES "farm_blocks"("id") ON DELETE cascade,
  "crop_variety_id" text NOT NULL REFERENCES "crop_varieties"("id"),
  "total_trees" integer DEFAULT 0 NOT NULL,
  "productive_trees" integer DEFAULT 0 NOT NULL,
  "non_productive_trees" integer DEFAULT 0 NOT NULL,
  "dead_trees" integer DEFAULT 0 NOT NULL,
  "planting_date" date,
  "effective_from" date DEFAULT CURRENT_DATE NOT NULL,
  "effective_to" date,
  "notes" text,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CHECK ("total_trees" >= "productive_trees" + "non_productive_trees" + "dead_trees"),
  CHECK ("total_trees" >= 0 AND "productive_trees" >= 0 AND "non_productive_trees" >= 0 AND "dead_trees" >= 0),
  CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from")
);
CREATE INDEX IF NOT EXISTS "block_crop_inventories_block_idx" ON "block_crop_inventories" ("block_id", "effective_from");

-- Full append-only deactivation/reactivation history for farms and blocks (one row per
-- cycle -- deliberately not single-slot columns on the farm/block row, so every past
-- cycle stays queryable, not just the most recent).
CREATE TABLE IF NOT EXISTS "farm_status_history" (
  "id" text PRIMARY KEY NOT NULL,
  "farm_id" text NOT NULL REFERENCES "farms"("id") ON DELETE cascade,
  "action" text NOT NULL CHECK ("action" IN ('deactivated', 'reactivated', 'archived')),
  "previous_status" text,
  "new_status" text NOT NULL,
  "reason" text,
  "effective_date" date,
  "performed_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "farm_status_history_farm_idx" ON "farm_status_history" ("farm_id", "created_at");

CREATE TABLE IF NOT EXISTS "block_status_history" (
  "id" text PRIMARY KEY NOT NULL,
  "block_id" text NOT NULL REFERENCES "farm_blocks"("id") ON DELETE cascade,
  "action" text NOT NULL CHECK ("action" IN ('deactivated', 'reactivated', 'archived')),
  "previous_status" text,
  "new_status" text NOT NULL,
  "reason" text,
  "effective_date" date,
  "performed_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "block_status_history_block_idx" ON "block_status_history" ("block_id", "created_at");
