-- Hardening migration.

-- Unique index on refresh_tokens.token_hash: the token lookup runs on every
-- authenticated request; without this index it is a full table scan. The
-- unique constraint also prevents the (astronomically unlikely) case of two
-- tokens hashing to the same value being independently valid.
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_token_hash_uniq_idx"
  ON "refresh_tokens" ("token_hash");

-- Password reset tokens: single-use, 30-min TTL, SHA-256 hashed.
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "token_hash" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "prt_user_idx" ON "password_reset_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "prt_hash_idx" ON "password_reset_tokens" ("token_hash");
