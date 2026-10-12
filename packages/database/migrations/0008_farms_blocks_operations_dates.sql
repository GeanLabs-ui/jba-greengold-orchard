-- Adds the operations-start / planting-start dates called for in the farm and block
-- profile forms. Split out as its own migration (rather than folded into 0005) because it
-- was identified after 0005/0006/0007 had already been written and applied locally --
-- new migration file, per the "never edit an applied migration" rule.

ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "operations_started_on" date;
ALTER TABLE "farms" ADD COLUMN IF NOT EXISTS "planting_started_on" date;

ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "operations_started_on" date;
ALTER TABLE "farm_blocks" ADD COLUMN IF NOT EXISTS "planting_started_on" date;
