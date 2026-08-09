-- Complete the Farm/FarmBlock cut-over to the relational model. Daily Routine Check
-- historically stored these operational fields only inside entity_records JSONB. The
-- relational rows already preserve the legacy record ids (0007), so this migration can
-- backfill in place without losing links from activities, harvests, or calendar records.

ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS programme_code text;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS early_harvest boolean DEFAULT false NOT NULL;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS shoot_maturity real DEFAULT 0 NOT NULL;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS forecast_yield_kg real DEFAULT 0 NOT NULL;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS fruit_fly_pressure text DEFAULT 'Low' NOT NULL;
ALTER TABLE farm_blocks ADD COLUMN IF NOT EXISTS disease_rating text DEFAULT 'Low' NOT NULL;

UPDATE farm_blocks fb
SET
  programme_code = COALESCE(NULLIF(trim(er.data->>'programme_code'), ''), fb.programme_code),
  source = COALESCE(NULLIF(trim(er.data->>'source'), ''), fb.source),
  early_harvest = CASE
    WHEN lower(COALESCE(er.data->>'early_harvest', '')) IN ('true', 'yes', '1') THEN true
    WHEN lower(COALESCE(er.data->>'early_harvest', '')) IN ('false', 'no', '0') THEN false
    ELSE fb.early_harvest
  END,
  shoot_maturity = COALESCE(NULLIF(er.data->>'shoot_maturity', '')::real, fb.shoot_maturity),
  forecast_yield_kg = COALESCE(NULLIF(er.data->>'forecast_yield_kg', '')::real, fb.forecast_yield_kg),
  fruit_fly_pressure = COALESCE(NULLIF(trim(er.data->>'fruit_fly_pressure'), ''), fb.fruit_fly_pressure),
  disease_rating = COALESCE(NULLIF(trim(er.data->>'disease_rating'), ''), fb.disease_rating),
  updated_at = GREATEST(fb.updated_at, er.updated_at)
FROM entity_records er
WHERE er.entity_name = 'FarmBlock' AND er.id = fb.id;

ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_shoot_maturity_nonnegative_check
  CHECK (shoot_maturity >= 0) NOT VALID;
ALTER TABLE farm_blocks VALIDATE CONSTRAINT farm_blocks_shoot_maturity_nonnegative_check;

ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_forecast_yield_nonnegative_check
  CHECK (forecast_yield_kg >= 0) NOT VALID;
ALTER TABLE farm_blocks VALIDATE CONSTRAINT farm_blocks_forecast_yield_nonnegative_check;

CREATE INDEX IF NOT EXISTS farm_blocks_programme_code_idx ON farm_blocks (programme_code);

-- The legacy Farm/FarmBlock JSON rows intentionally remain as an inert rollback snapshot.
-- Runtime reads and writes are switched by apps/api/src/modules/entities.ts to farms and
-- farm_blocks, making those relational tables the sole active source of truth.
