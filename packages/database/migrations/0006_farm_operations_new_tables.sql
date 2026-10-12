-- New relational tables for harvest periods, activity stages, normalized yield time-series,
-- and block merge history. All reference farms/farm_blocks as extended in 0005.

CREATE TABLE IF NOT EXISTS "harvest_periods" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "farm_id" text NOT NULL REFERENCES "farms"("id") ON DELETE cascade,
  "block_id" text REFERENCES "farm_blocks"("id"),
  "crop_variety_id" text REFERENCES "crop_varieties"("id"),
  "harvest_type" text NOT NULL CHECK ("harvest_type" IN ('early_harvest', 'major_harvest', 'late_harvest', 'off_season_harvest')),
  "status" text DEFAULT 'planned' NOT NULL CHECK ("status" IN ('planned', 'active', 'completed', 'cancelled')),
  "season_year" integer,
  "expected_start_date" date,
  "expected_end_date" date,
  "actual_start_date" date,
  "actual_end_date" date,
  "expected_yield_kg" real DEFAULT 0,
  "actual_yield_kg" real DEFAULT 0,
  "notes" text,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CHECK ("expected_end_date" IS NULL OR "expected_start_date" IS NULL OR "expected_end_date" >= "expected_start_date"),
  CHECK ("actual_end_date" IS NULL OR "actual_start_date" IS NULL OR "actual_end_date" >= "actual_start_date")
);
CREATE INDEX IF NOT EXISTS "harvest_periods_block_type_idx" ON "harvest_periods" ("block_id", "harvest_type");
CREATE INDEX IF NOT EXISTS "harvest_periods_farm_date_idx" ON "harvest_periods" ("farm_id", "expected_start_date");
CREATE INDEX IF NOT EXISTS "harvest_periods_status_idx" ON "harvest_periods" ("status");

-- Normalized time-series yield facts that power the yield charts. Deliberately separate
-- from harvest_batches (a packhouse grading ledger with no period link, shaped for a
-- different purpose) so daily/weekly/monthly/yearly aggregation can run directly over a
-- clean date-indexed table.
CREATE TABLE IF NOT EXISTS "yield_records" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "farm_id" text NOT NULL REFERENCES "farms"("id") ON DELETE cascade,
  "block_id" text NOT NULL REFERENCES "farm_blocks"("id"),
  "harvest_period_id" text REFERENCES "harvest_periods"("id"),
  "crop_variety_id" text REFERENCES "crop_varieties"("id"),
  "record_date" date NOT NULL,
  "harvest_type" text CHECK ("harvest_type" IS NULL OR "harvest_type" IN ('early_harvest', 'major_harvest', 'late_harvest', 'off_season_harvest')),
  "actual_yield_kg" real DEFAULT 0 NOT NULL,
  "forecast_yield_kg" real DEFAULT 0,
  "notes" text,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CHECK ("actual_yield_kg" >= 0),
  CHECK ("forecast_yield_kg" IS NULL OR "forecast_yield_kg" >= 0)
);
CREATE INDEX IF NOT EXISTS "yield_records_block_date_idx" ON "yield_records" ("block_id", "record_date");
CREATE INDEX IF NOT EXISTS "yield_records_farm_date_idx" ON "yield_records" ("farm_id", "record_date");

-- Extensible operational activity/stage tracking. activity_type has no DB CHECK enum on
-- purpose (see apps/api/src/modules/farm-activity-types.ts) so a new stage type is a code
-- change, not a migration.
CREATE TABLE IF NOT EXISTS "farm_activity_periods" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "farm_id" text NOT NULL REFERENCES "farms"("id") ON DELETE cascade,
  "block_id" text REFERENCES "farm_blocks"("id"),
  "activity_type" text NOT NULL,
  "status" text DEFAULT 'planned' NOT NULL CHECK ("status" IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled')),
  "season_year" integer,
  "planned_start_date" date,
  "planned_end_date" date,
  "actual_start_date" date,
  "actual_end_date" date,
  "completion_percent" integer DEFAULT 0 NOT NULL CHECK ("completion_percent" BETWEEN 0 AND 100),
  "assigned_to" text REFERENCES "users"("id") ON DELETE set null,
  "notes" text,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CHECK ("planned_end_date" IS NULL OR "planned_start_date" IS NULL OR "planned_end_date" >= "planned_start_date"),
  CHECK ("actual_end_date" IS NULL OR "actual_start_date" IS NULL OR "actual_end_date" >= "actual_start_date")
);
CREATE INDEX IF NOT EXISTS "farm_activity_periods_block_date_idx" ON "farm_activity_periods" ("block_id", "planned_start_date");
CREATE INDEX IF NOT EXISTS "farm_activity_periods_farm_date_idx" ON "farm_activity_periods" ("farm_id", "planned_start_date");
CREATE INDEX IF NOT EXISTS "farm_activity_periods_status_idx" ON "farm_activity_periods" ("status");

-- Block merge history. No column here ever causes a historical foreign key to be
-- reassigned -- yield_records/harvest_periods/farm_activity_periods rows created before
-- a merge's effective_date keep pointing at their original source block forever.
CREATE TABLE IF NOT EXISTS "block_merges" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "farm_id" text NOT NULL REFERENCES "farms"("id") ON DELETE cascade,
  "destination_block_id" text NOT NULL REFERENCES "farm_blocks"("id"),
  "effective_date" date NOT NULL,
  "reason" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "status" text DEFAULT 'completed' NOT NULL CHECK ("status" IN ('completed', 'failed')),
  "impact_snapshot" jsonb NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "block_merges_org_idempotency_idx" ON "block_merges" ("organization_id", "idempotency_key");
CREATE INDEX IF NOT EXISTS "block_merges_farm_idx" ON "block_merges" ("farm_id");
CREATE INDEX IF NOT EXISTS "block_merges_destination_idx" ON "block_merges" ("destination_block_id");

CREATE TABLE IF NOT EXISTS "block_merge_sources" (
  "id" text PRIMARY KEY NOT NULL,
  "block_merge_id" text NOT NULL REFERENCES "block_merges"("id") ON DELETE cascade,
  "source_block_id" text NOT NULL REFERENCES "farm_blocks"("id"),
  "pre_merge_status" text NOT NULL,
  "pre_merge_snapshot" jsonb NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "block_merge_sources_merge_source_idx" ON "block_merge_sources" ("block_merge_id", "source_block_id");
CREATE INDEX IF NOT EXISTS "block_merge_sources_source_idx" ON "block_merge_sources" ("source_block_id");
