-- ============================================================
-- Migration 002: Row Level Security
-- Run AFTER 001_schema.sql
-- ============================================================

-- Helper: returns current user's household_id
CREATE OR REPLACE FUNCTION get_user_household_id()
RETURNS UUID AS $$
  SELECT household_id FROM household_members
  WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE households     ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chore_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs  ENABLE ROW LEVEL SECURITY;

-- ─── Profiles ──────────────────────────────────────────────
CREATE POLICY "own profile"            ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "household member profiles" ON profiles FOR SELECT USING (id IN (SELECT user_id FROM household_members WHERE household_id = get_user_household_id()));
CREATE POLICY "update own profile"     ON profiles FOR UPDATE USING (id = auth.uid());

-- ─── Households ────────────────────────────────────────────
CREATE POLICY "members view household" ON households FOR SELECT USING (id = get_user_household_id());
CREATE POLICY "create household"       ON households FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owner update"           ON households FOR UPDATE USING (owner_id = auth.uid());

-- ─── Household Members ─────────────────────────────────────
CREATE POLICY "view members"    ON household_members FOR SELECT USING (household_id = get_user_household_id());
CREATE POLICY "insert members"  ON household_members FOR INSERT WITH CHECK (true);

-- ─── Invitations ───────────────────────────────────────────
CREATE POLICY "view own invitations" ON invitations FOR SELECT USING (household_id = get_user_household_id() OR true);
CREATE POLICY "create invitation"    ON invitations FOR INSERT WITH CHECK (created_by = auth.uid() AND household_id = get_user_household_id());
CREATE POLICY "update invitation"    ON invitations FOR UPDATE USING (true);

-- ─── Points Ledger ─────────────────────────────────────────
CREATE POLICY "view household points" ON points_ledger FOR SELECT USING (household_id = get_user_household_id());
CREATE POLICY "insert points"         ON points_ledger FOR INSERT WITH CHECK (household_id = get_user_household_id());
CREATE POLICY "update points"         ON points_ledger FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Tasks ─────────────────────────────────────────────────
CREATE POLICY "view tasks"   ON tasks FOR SELECT USING (household_id = get_user_household_id() AND deleted_at IS NULL);
CREATE POLICY "create task"  ON tasks FOR INSERT WITH CHECK (household_id = get_user_household_id() AND created_by = auth.uid());
CREATE POLICY "update task"  ON tasks FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Chores ────────────────────────────────────────────────
CREATE POLICY "view chores"  ON chores FOR SELECT USING (household_id = get_user_household_id() AND deleted_at IS NULL);
CREATE POLICY "create chore" ON chores FOR INSERT WITH CHECK (household_id = get_user_household_id() AND created_by = auth.uid());
CREATE POLICY "update chore" ON chores FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Chore Logs (edit-not-delete — soft delete only) ───────
CREATE POLICY "view chore logs"   ON chore_logs FOR SELECT USING (household_id = get_user_household_id() AND deleted_at IS NULL);
CREATE POLICY "create chore log"  ON chore_logs FOR INSERT WITH CHECK (household_id = get_user_household_id() AND completed_by = auth.uid());
CREATE POLICY "update chore log"  ON chore_logs FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Reminders ─────────────────────────────────────────────
CREATE POLICY "view reminders"  ON reminders FOR SELECT USING (household_id = get_user_household_id() AND deleted_at IS NULL);
CREATE POLICY "create reminder" ON reminders FOR INSERT WITH CHECK (household_id = get_user_household_id() AND created_by = auth.uid());
CREATE POLICY "update reminder" ON reminders FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Notes ─────────────────────────────────────────────────
CREATE POLICY "view notes"  ON notes FOR SELECT USING (household_id = get_user_household_id() AND deleted_at IS NULL);
CREATE POLICY "create note" ON notes FOR INSERT WITH CHECK (household_id = get_user_household_id() AND created_by = auth.uid());
CREATE POLICY "update note" ON notes FOR UPDATE USING (household_id = get_user_household_id());

-- ─── Activity Logs ─────────────────────────────────────────
CREATE POLICY "view activity"  ON activity_logs FOR SELECT USING (household_id = get_user_household_id());
CREATE POLICY "insert activity" ON activity_logs FOR INSERT WITH CHECK (household_id = get_user_household_id() AND user_id = auth.uid());
