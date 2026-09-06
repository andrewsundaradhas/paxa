# paxa — Supabase Security Matrix

**Status: ⚠️ INCOMPLETE** — must be completed before production.

The Express API connects to Supabase using the **service-role** connection (bypasses RLS). The mobile app **never talks to Supabase directly** — it only talks to the Express API over HTTPS. Therefore RLS is **defense-in-depth**, not the primary authorization mechanism.

| Table | RLS Enabled | SELECT | INSERT | UPDATE | DELETE | Risk |
|-------|-------------|--------|--------|--------|--------|------|
| users | ✅ (in script) | ❌ No policy | ❌ No policy | ❌ No policy | ❌ No policy | 🔴 Script would block ALL access if applied unattended |
| refresh_tokens | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| groups | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| group_members | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| group_invites | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| expenses | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| expense_splits | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| settlements | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| audit_log | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| device_push_tokens | ✅ (in script) | ❌ | ❌ | ❌ | ❌ | 🔴 |
| password_reset_tokens | ❌ Not enabled | — | — | — | — | 🟡 |
| receipts | ❌ Not enabled | — | — | — | — | 🟡 |
| payment_requests | ❌ Not enabled | — | — | — | — | 🟡 |
| notifications | ❌ Not enabled | — | — | — | — | 🟡 |
| spending_insights | ❌ Not enabled | — | — | — | — | 🟡 |

## Threat Model

The application's authorization is enforced **in the Express API layer** (`requireAuth` + `requireGroupMember` + per-route ownership checks). The client never holds Supabase credentials. RLS is a **second line of defense** against:

1. **Leaked service-role key** (via misconfigured env, accidental commit, or server compromise)
2. **Direct DB exposure** (misconfigured network rules, leaked connection string)
3. **Insider threat** (someone with DB read access)

## Recommended Policies

If RLS is applied, it must use **authenticated user-id policies** (not anonymous). Since Supabase Auth is not used (the API issues its own JWTs), direct Supabase access would need a mapping layer. Recommend:

```sql
-- For users: every user can only see/edit their own row
CREATE POLICY users_own ON users
  FOR ALL
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- For groups: members can read groups they belong to
CREATE POLICY groups_members_read ON groups
  FOR SELECT
  USING (
    id IN (
      SELECT group_id FROM group_members WHERE user_id = auth.uid()
    )
  );

-- (Continue for each table appropriate to its ownership model)
```

**However:** Because the app uses service-role connections and custom JWTs (not `auth.uid()`), `auth.uid()` will be NULL for API-originated requests. Applying user-level RLS without a Supabase Auth token model will **break service-role writes**.

## Correct Approach

Either:
1. **Option A — Keep API service-role only:** Leave RLS disabled; rely on API-layer authorization + network isolation (recommended for this architecture since the client is a native app that never touches the DB).
2. **Option B — Full RLS:** Configure Supabase Auth to mirror paxa users, issue `auth.uid()` correctly, and write policies for every table. High effort, high benefit.

**Recommendation for current architecture:** Option A (RLS disabled, service-role only), with the API layer being the sole authorization authority. The existing `supabase-rls.sql` is **dangerous** because it enables RLS (locking all rows) without policies — running it as-is would break the app. Either complete it fully or remove it.

## Storage Buckets

N/A — no file storage in use. OCR runs on-device.

## SECURITY DEFINER Functions

None found — no custom functions or triggers in the schema.

## SQL Injection Risk

The API uses Drizzle ORM with parameterized queries exclusively. No raw SQL interpolation of user input. Low risk.
