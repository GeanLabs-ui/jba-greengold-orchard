-- Persist the additional fields exposed by the block profile editor.
-- `variety` already stores the selected mango variety; the two fields below did
-- not have a relational home, causing API updates to silently discard them.

ALTER TABLE farm_blocks
  ADD COLUMN IF NOT EXISTS actual_yield_kg real,
  ADD COLUMN IF NOT EXISTS disease_severity text;

ALTER TABLE farm_blocks
  DROP CONSTRAINT IF EXISTS farm_blocks_actual_yield_nonnegative_check;
ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_actual_yield_nonnegative_check
  CHECK (actual_yield_kg IS NULL OR actual_yield_kg >= 0) NOT VALID;
ALTER TABLE farm_blocks
  VALIDATE CONSTRAINT farm_blocks_actual_yield_nonnegative_check;

ALTER TABLE farm_blocks
  DROP CONSTRAINT IF EXISTS farm_blocks_disease_severity_check;
ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_disease_severity_check
  CHECK (disease_severity IS NULL OR disease_severity IN ('Low', 'Medium', 'High')) NOT VALID;
ALTER TABLE farm_blocks
  VALIDATE CONSTRAINT farm_blocks_disease_severity_check;
