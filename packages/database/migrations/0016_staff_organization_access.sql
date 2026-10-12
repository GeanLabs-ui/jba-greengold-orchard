ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "page_access" jsonb;

ALTER TABLE "staff_invitations"
  ADD COLUMN IF NOT EXISTS "page_access" jsonb,
  ADD COLUMN IF NOT EXISTS "employee_id" text;

CREATE INDEX IF NOT EXISTS "staff_invitations_employee_idx"
  ON "staff_invitations" ("employee_id");

UPDATE "entity_records"
SET "data" = jsonb_set(
  "data",
  '{employee_code}',
  to_jsonb(
    'JBA-' || to_char("created_at" AT TIME ZONE 'UTC', 'YYYYMMDD-HH24MISS') || '-' || upper(substr(replace("id", '-', ''), 1, 4))
  ),
  true
)
WHERE "entity_name" = 'Employee'
  AND COALESCE("data"->>'employee_code', '') = '';
