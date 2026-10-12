-- Finalize constraints after 0007 has assigned every legacy block to a parent farm.
-- Nullable size remains supported for migrated records whose historical acreage was never
-- captured, but every newly supplied value must be positive. No records are deleted.

INSERT INTO farms (id, farm_code, name, status, created_at, updated_at)
SELECT gen_random_uuid()::text, 'UNASSIGNED', 'Unassigned Blocks', 'active', now(), now()
WHERE EXISTS (SELECT 1 FROM farm_blocks WHERE farm_id IS NULL)
  AND NOT EXISTS (SELECT 1 FROM farms WHERE farm_code = 'UNASSIGNED');

UPDATE farm_blocks
SET farm_id = (SELECT id FROM farms WHERE farm_code = 'UNASSIGNED' LIMIT 1),
    updated_at = now()
WHERE farm_id IS NULL;

ALTER TABLE farm_blocks ALTER COLUMN farm_id SET NOT NULL;

ALTER TABLE farms
  ADD CONSTRAINT farms_size_acres_positive_check
  CHECK (size_acres IS NULL OR size_acres > 0) NOT VALID;
ALTER TABLE farms VALIDATE CONSTRAINT farms_size_acres_positive_check;

ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_size_acres_positive_check
  CHECK (size_acres IS NULL OR size_acres > 0) NOT VALID;
ALTER TABLE farm_blocks VALIDATE CONSTRAINT farm_blocks_size_acres_positive_check;

ALTER TABLE farms
  ADD CONSTRAINT farms_tree_count_nonnegative_check
  CHECK (tree_count IS NULL OR tree_count >= 0) NOT VALID;
ALTER TABLE farms VALIDATE CONSTRAINT farms_tree_count_nonnegative_check;

ALTER TABLE farm_blocks
  ADD CONSTRAINT farm_blocks_tree_count_nonnegative_check
  CHECK (tree_count IS NULL OR tree_count >= 0) NOT VALID;
ALTER TABLE farm_blocks VALIDATE CONSTRAINT farm_blocks_tree_count_nonnegative_check;
