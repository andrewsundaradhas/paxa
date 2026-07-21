-- Enable Row-Level Security on all paxa tables (run in Supabase SQL editor after migrations).
-- The mobile app talks to the Express API only; RLS is defence-in-depth if the DB is exposed.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Example: members can read groups they belong to (customize per your auth.uid() setup).
-- CREATE POLICY "members_read_groups" ON groups FOR SELECT
--   USING (id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()));
