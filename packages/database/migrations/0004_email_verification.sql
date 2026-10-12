-- Email verification tokens table
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "email_verification_user_idx" ON "email_verification_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "email_verification_expiry_idx" ON "email_verification_tokens" ("expires_at");
