CREATE TABLE IF NOT EXISTS "staff_invitations" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "full_name" text,
  "role" text NOT NULL,
  "token_hash" text NOT NULL UNIQUE,
  "invited_by" text NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
  "expires_at" timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "staff_invitations_pending_email_unique"
  ON "staff_invitations" (lower("email"))
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;

CREATE INDEX IF NOT EXISTS "staff_invitations_expiry_idx"
  ON "staff_invitations" ("expires_at");
