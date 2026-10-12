ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" timestamp with time zone;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_login_at" timestamp with time zone;

CREATE TABLE IF NOT EXISTS "organizations" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text NOT NULL UNIQUE,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "organization_members" (
  "organization_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "role" text DEFAULT 'customer' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  PRIMARY KEY ("organization_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "organization_members_user_idx" ON "organization_members" ("user_id");

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "csrf_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
  "user_agent" text,
  "ip_address" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sessions_user_idx" ON "sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expiry_idx" ON "sessions" ("expires_at");

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL UNIQUE,
  "expires_at" timestamp with time zone NOT NULL,
  "used_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "password_reset_user_idx" ON "password_reset_tokens" ("user_id");

CREATE TABLE IF NOT EXISTS "entity_records" (
  "id" text PRIMARY KEY NOT NULL,
  "entity_name" text NOT NULL,
  "organization_id" text REFERENCES "organizations"("id") ON DELETE cascade,
  "owner_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "data" jsonb NOT NULL,
  "created_by" text REFERENCES "users"("id") ON DELETE set null,
  "updated_by" text REFERENCES "users"("id") ON DELETE set null,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "entity_records_entity_created_idx" ON "entity_records" ("entity_name", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "entity_records_owner_idx" ON "entity_records" ("owner_user_id", "entity_name");
CREATE INDEX IF NOT EXISTS "entity_records_org_idx" ON "entity_records" ("organization_id", "entity_name");

CREATE TABLE IF NOT EXISTS "file_objects" (
  "id" text PRIMARY KEY NOT NULL,
  "object_key" text NOT NULL UNIQUE,
  "original_name" text NOT NULL,
  "content_type" text NOT NULL,
  "size_bytes" integer NOT NULL CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880),
  "owner_user_id" text REFERENCES "users"("id") ON DELETE set null,
  "record_id" text,
  "status" text DEFAULT 'quarantined' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "file_objects_record_idx" ON "file_objects" ("record_id");

CREATE TABLE IF NOT EXISTS "rate_limit_windows" (
  "key_hash" text NOT NULL,
  "action" text NOT NULL,
  "window_start" timestamp with time zone NOT NULL,
  "count" integer DEFAULT 1 NOT NULL CHECK ("count" > 0),
  "expires_at" timestamp with time zone NOT NULL,
  PRIMARY KEY ("key_hash", "action", "window_start")
);
CREATE INDEX IF NOT EXISTS "rate_limit_expiry_idx" ON "rate_limit_windows" ("expires_at");
