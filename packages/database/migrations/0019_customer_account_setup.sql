-- Additive account setup storage. Identity documents remain in private R2 buckets.
CREATE TABLE IF NOT EXISTS account_profiles (
  user_id text PRIMARY KEY REFERENCES users(id),
  photo_file_id text REFERENCES file_objects(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS account_verifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  identity jsonb NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'verified', 'rejected')),
  provider text NOT NULL CHECK (provider IN ('hubtel', 'stripe_identity', 'admin_review')),
  provider_session_id text UNIQUE,
  document_ids jsonb NOT NULL DEFAULT '[]',
  consent_at timestamptz NOT NULL DEFAULT now(),
  review_note text,
  reviewed_by text REFERENCES users(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS account_verification_active_user ON account_verifications(user_id) WHERE status IN ('pending', 'verified');
CREATE INDEX IF NOT EXISTS account_verification_user ON account_verifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS account_change_requests (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id),
  verification_id text NOT NULL REFERENCES account_verifications(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS account_change_request_pending ON account_change_requests(user_id) WHERE status = 'pending';
