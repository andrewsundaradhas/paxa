-- OAuth (Continue with Google / Apple) support.
-- passwordHash becomes nullable so social-only accounts need no password.
-- Account linking: a social sign-in whose email matches an existing user
-- adopts that account (handled in the API layer), so no duplicate is created.

ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" text NOT NULL DEFAULT 'password';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "apple_sub" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;

-- One account per provider subject.
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_uniq" ON "users" ("google_sub") WHERE "google_sub" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_apple_sub_uniq" ON "users" ("apple_sub") WHERE "apple_sub" IS NOT NULL;
