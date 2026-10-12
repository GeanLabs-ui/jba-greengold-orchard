-- Data-only backfill from entity_records into the relational farms/farm_blocks/
-- crop_varieties/block_crop_inventories tables extended in 0005/0006. entity_records rows
-- for 'Farm'/'FarmBlock' are NEVER modified or deleted by this migration -- they remain the
-- live backing store for apps/web/src/pages/admin/DailyRoutineCheck.jsx's other tabs.
--
-- Ground truth discovered while writing this migration: in this environment there are zero
-- 'Farm' entity_records rows at all. Every 'FarmBlock' row instead carries an empty-string
-- data->>'farm_id' and a denormalized data->>'farm_name' (e.g. "Farm Land A"), grouped
-- client-side by block_code letter-prefix. This migration therefore synthesizes a parent
-- farm per distinct farm_name found on orphaned blocks (in addition to backfilling any real
-- 'Farm' rows verbatim, for environments where they do exist), so no block is left orphaned.

-- Step 1: any real 'Farm' entity_records rows, backfilled verbatim with their id preserved.
INSERT INTO farms (
  id, farm_code, name, location, region, country, latitude, longitude, size_acres,
  owner_name, tree_count, production_capacity_kg, status, image_url, description, notes,
  created_at, updated_at
)
SELECT
  er.id,
  COALESCE(NULLIF(trim(er.data->>'farm_code'), ''), 'FARM-' || substr(er.id, 1, 8)),
  COALESCE(NULLIF(trim(er.data->>'name'), ''), 'Farm ' || substr(er.id, 1, 8)),
  NULLIF(trim(er.data->>'location'), ''),
  NULLIF(trim(er.data->>'region'), ''),
  COALESCE(NULLIF(trim(er.data->>'country'), ''), 'Ghana'),
  NULLIF(er.data->>'latitude', '')::real,
  NULLIF(er.data->>'longitude', '')::real,
  NULLIF(er.data->>'size_acres', '')::real,
  NULLIF(trim(er.data->>'owner_name'), ''),
  COALESCE(NULLIF(er.data->>'tree_count', '')::integer, 0),
  COALESCE(NULLIF(er.data->>'production_capacity_kg', '')::integer, 0),
  COALESCE(NULLIF(trim(er.data->>'status'), ''), 'active'),
  NULLIF(trim(er.data->>'image_url'), ''),
  NULLIF(trim(er.data->>'description'), ''),
  NULLIF(trim(er.data->>'notes'), ''),
  er.created_at,
  er.updated_at
FROM entity_records er
WHERE er.entity_name = 'Farm'
ON CONFLICT (id) DO NOTHING;

-- Step 2: synthesize a parent farm for each distinct farm_name referenced by a FarmBlock
-- row whose farm_id doesn't resolve to a real farm from step 1.
CREATE TEMP TABLE _migration_0007_synth_farms AS
SELECT
  gen_random_uuid()::text AS id,
  farm_name,
  upper(regexp_replace(farm_name, '[^A-Za-z0-9]+', '-', 'g')) AS farm_code
FROM (
  SELECT DISTINCT trim(er.data->>'farm_name') AS farm_name
  FROM entity_records er
  WHERE er.entity_name = 'FarmBlock'
    AND NULLIF(trim(er.data->>'farm_name'), '') IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM farms f WHERE f.id = NULLIF(trim(er.data->>'farm_id'), ''))
) AS distinct_names
WHERE farm_name IS NOT NULL;

INSERT INTO farms (id, farm_code, name, status, created_at, updated_at)
SELECT id, farm_code, farm_name, 'active', now(), now()
FROM _migration_0007_synth_farms
ON CONFLICT (farm_code) DO NOTHING;

-- Step 3: resolve every FarmBlock row to a farm id (real match -> synthesized-by-name match
-- -> name match against a real farm -> a final "Unassigned Blocks" catch-all so nothing is
-- ever left without a parent).
CREATE TEMP TABLE _migration_0007_block_farm_map AS
SELECT
  er.id AS block_entity_id,
  er.data AS data,
  er.created_at,
  er.updated_at,
  COALESCE(
    (SELECT f.id FROM farms f WHERE f.id = NULLIF(trim(er.data->>'farm_id'), '')),
    (SELECT sf.id FROM _migration_0007_synth_farms sf WHERE sf.farm_name = trim(er.data->>'farm_name')),
    (SELECT f2.id FROM farms f2 WHERE f2.name = trim(er.data->>'farm_name'))
  ) AS resolved_farm_id
FROM entity_records er
WHERE er.entity_name = 'FarmBlock';

INSERT INTO farms (id, farm_code, name, status, created_at, updated_at)
SELECT gen_random_uuid()::text, 'UNASSIGNED', 'Unassigned Blocks', 'active', now(), now()
WHERE EXISTS (SELECT 1 FROM _migration_0007_block_farm_map WHERE resolved_farm_id IS NULL)
ON CONFLICT (farm_code) DO NOTHING;

UPDATE _migration_0007_block_farm_map
SET resolved_farm_id = (SELECT id FROM farms WHERE farm_code = 'UNASSIGNED')
WHERE resolved_farm_id IS NULL;

-- Step 4: insert blocks, preserving their entity_records id, keeping only the earliest row
-- per (farm, block_code) to satisfy the new per-farm uniqueness constraint. Any row this
-- excludes (duplicate code, or missing block_code entirely) is logged for manual review
-- rather than silently dropped.
INSERT INTO farm_blocks (
  id, farm_id, block_code, name, size_acres, variety, tree_count, status, created_at, updated_at
)
SELECT DISTINCT ON (m.resolved_farm_id, trim(m.data->>'block_code'))
  m.block_entity_id,
  m.resolved_farm_id,
  trim(m.data->>'block_code'),
  COALESCE(NULLIF(trim(m.data->>'name'), ''), trim(m.data->>'block_code')),
  COALESCE(NULLIF(m.data->>'acres', '')::real, NULLIF(m.data->>'area_acres', '')::real),
  NULLIF(trim(m.data->>'variety'), ''),
  COALESCE(NULLIF(m.data->>'tree_count', '')::integer, 0),
  COALESCE(NULLIF(trim(m.data->>'status'), ''), 'active'),
  m.created_at,
  m.updated_at
FROM _migration_0007_block_farm_map m
WHERE NULLIF(trim(m.data->>'block_code'), '') IS NOT NULL
ORDER BY m.resolved_farm_id, trim(m.data->>'block_code'), m.created_at ASC
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS "_migration_0007_block_code_conflicts" (
  "entity_record_id" text,
  "farm_id" text,
  "block_code" text,
  "created_at" timestamp with time zone,
  "logged_at" timestamp with time zone DEFAULT now()
);
INSERT INTO "_migration_0007_block_code_conflicts" (entity_record_id, farm_id, block_code, created_at)
SELECT m.block_entity_id, m.resolved_farm_id, trim(m.data->>'block_code'), m.created_at
FROM _migration_0007_block_farm_map m
WHERE NOT EXISTS (SELECT 1 FROM farm_blocks fb WHERE fb.id = m.block_entity_id);

-- Step 5: seed crop_varieties from every distinct legacy variety string observed, then one
-- block_crop_inventories row per migrated block that had a variety, defaulting all trees to
-- productive (no source data distinguishes productive/non-productive/dead for legacy blocks;
-- correctable afterwards through the new inventory UI).
INSERT INTO crop_varieties (id, organization_id, name, is_active, created_at, updated_at)
SELECT gen_random_uuid()::text, NULL, v.name, true, now(), now()
FROM (
  SELECT DISTINCT trim(data->>'variety') AS name
  FROM entity_records
  WHERE entity_name = 'FarmBlock' AND NULLIF(trim(data->>'variety'), '') IS NOT NULL
) v
ON CONFLICT (organization_id, name) DO NOTHING;

INSERT INTO block_crop_inventories (
  id, block_id, crop_variety_id, total_trees, productive_trees, non_productive_trees, dead_trees,
  effective_from, created_at, updated_at
)
SELECT
  gen_random_uuid()::text,
  fb.id,
  cv.id,
  COALESCE(fb.tree_count, 0),
  COALESCE(fb.tree_count, 0),
  0,
  0,
  fb.created_at::date,
  now(),
  now()
FROM farm_blocks fb
JOIN crop_varieties cv ON cv.name = fb.variety AND cv.organization_id IS NULL
WHERE fb.variety IS NOT NULL;

DROP TABLE IF EXISTS _migration_0007_block_farm_map;
DROP TABLE IF EXISTS _migration_0007_synth_farms;
