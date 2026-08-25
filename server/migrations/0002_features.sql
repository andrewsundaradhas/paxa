-- Feature foundation migration: receipts, payment requests, notifications,
-- and cached spending insights. All additive — no existing table is altered.
-- Authorization stays in the API layer (no RLS by product decision).

-- Scanned bill/receipt (OCR runs on-device; only extracted fields are stored).
CREATE TABLE IF NOT EXISTS "receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "group_id" uuid REFERENCES "groups"("id") ON DELETE set null,
  "merchant" text,
  "category" text NOT NULL DEFAULT 'Other',
  "total_paise" integer NOT NULL,
  "receipt_date" timestamptz,
  "raw_text" text,
  "items" jsonb,
  "status" text NOT NULL DEFAULT 'reviewed',
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "deleted_at" timestamptz
);
CREATE INDEX IF NOT EXISTS "receipt_user_idx" ON "receipts" ("user_id");

-- 1:1 (or off-app) money requests, distinct from group settlements.
CREATE TABLE IF NOT EXISTS "payment_requests" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "from_user" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "to_user" uuid REFERENCES "users"("id") ON DELETE set null,
  "to_name" text NOT NULL,
  "amount_paise" integer NOT NULL,
  "note" text,
  "category" text NOT NULL DEFAULT 'Other',
  "status" text NOT NULL DEFAULT 'pending',
  "receipt_id" uuid REFERENCES "receipts"("id") ON DELETE set null,
  "group_id" uuid REFERENCES "groups"("id") ON DELETE set null,
  "due_at" timestamptz,
  "reminded_at" timestamptz,
  "paid_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "preq_from_idx" ON "payment_requests" ("from_user");
CREATE INDEX IF NOT EXISTS "preq_to_idx" ON "payment_requests" ("to_user");
CREATE INDEX IF NOT EXISTS "preq_status_idx" ON "payment_requests" ("status");

-- Persistent in-app notifications / reminders.
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "data" jsonb,
  "read_at" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "notif_user_idx" ON "notifications" ("user_id", "read_at");

-- Cached monthly spending insights (upserted on user + period).
CREATE TABLE IF NOT EXISTS "spending_insights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE cascade,
  "period" text NOT NULL,
  "payload" jsonb NOT NULL,
  "generated_at" timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT "uniq_user_period" UNIQUE ("user_id", "period")
);
