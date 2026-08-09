-- Complete the canonical relational farm and block profiles with agronomic and GPS data.
-- Progress and activity history remain normalized in farm_activity_periods so updates are auditable.

ALTER TABLE "farms"
  ADD COLUMN IF NOT EXISTS "soil_type" text,
  ADD COLUMN IF NOT EXISTS "soil_ph" real,
  ADD COLUMN IF NOT EXISTS "soil_notes" text;

ALTER TABLE "farm_blocks"
  ADD COLUMN IF NOT EXISTS "latitude" real,
  ADD COLUMN IF NOT EXISTS "longitude" real,
  ADD COLUMN IF NOT EXISTS "soil_type" text,
  ADD COLUMN IF NOT EXISTS "soil_ph" real,
  ADD COLUMN IF NOT EXISTS "soil_notes" text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farms_soil_ph_check') THEN
    ALTER TABLE "farms" ADD CONSTRAINT "farms_soil_ph_check"
      CHECK ("soil_ph" IS NULL OR "soil_ph" BETWEEN 0 AND 14);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farm_blocks_latitude_check') THEN
    ALTER TABLE "farm_blocks" ADD CONSTRAINT "farm_blocks_latitude_check"
      CHECK ("latitude" IS NULL OR "latitude" BETWEEN -90 AND 90);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farm_blocks_longitude_check') THEN
    ALTER TABLE "farm_blocks" ADD CONSTRAINT "farm_blocks_longitude_check"
      CHECK ("longitude" IS NULL OR "longitude" BETWEEN -180 AND 180);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'farm_blocks_soil_ph_check') THEN
    ALTER TABLE "farm_blocks" ADD CONSTRAINT "farm_blocks_soil_ph_check"
      CHECK ("soil_ph" IS NULL OR "soil_ph" BETWEEN 0 AND 14);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "farms_soil_type_idx" ON "farms" ("soil_type");
CREATE INDEX IF NOT EXISTS "farm_blocks_soil_type_idx" ON "farm_blocks" ("soil_type");
