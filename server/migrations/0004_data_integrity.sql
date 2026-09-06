-- Data-integrity hardening: CHECK constraints for money/status fields and
-- missing indexes on hot query paths. Additive — safe on live data.

-- Money fields must never be negative/zero where a positive amount is expected.
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_amount_paise_positive" CHECK ("amount_paise" > 0);
ALTER TABLE "expense_splits" ADD CONSTRAINT "expense_splits_share_nonnegative" CHECK ("share_paise" >= 0);
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_amount_paise_positive" CHECK ("amount_paise" > 0);
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_amount_paise_positive" CHECK ("amount_paise" > 0);
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_total_paise_positive" CHECK ("total_paise" > 0);

-- Status-machine allowlists.
ALTER TABLE "settlements" ADD CONSTRAINT "settlements_status_valid"
  CHECK ("status" IN ('initiated', 'completed', 'failed'));
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_status_valid"
  CHECK ("status" IN ('pending', 'paid', 'cancelled'));
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_role_valid"
  CHECK ("role" IN ('owner', 'member'));

-- One-of payer targets for payment_requests: either a paxa user or a name.
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_target_one_of"
  CHECK ("to_user" IS NOT NULL OR "to_name" IS NOT NULL);

-- Hot query-path indexes (insights, expense lists, settlement party lookups).
CREATE INDEX IF NOT EXISTS "expense_splits_user_idx" ON "expense_splits" ("user_id");
CREATE INDEX IF NOT EXISTS "expenses_paid_by_idx" ON "expenses" ("paid_by");
CREATE INDEX IF NOT EXISTS "settlements_from_user_idx" ON "settlements" ("from_user");
CREATE INDEX IF NOT EXISTS "settlements_to_user_idx" ON "settlements" ("to_user");
CREATE INDEX IF NOT EXISTS "settlements_status_idx" ON "settlements" ("status");