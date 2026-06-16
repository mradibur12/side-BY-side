-- ============================================================
-- Migration 001: Core Schema
-- Run in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Profiles ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Households ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  owner_id    UUID NOT NULL REFERENCES profiles(id),
  max_members INT NOT NULL DEFAULT 2,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Household Members ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS household_members (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id)
);

-- ─── Invitations (email-based) ─────────────────────────────

CREATE TABLE IF NOT EXISTS invitations (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16),'hex'),
  invited_email  TEXT,
  created_by     UUID NOT NULL REFERENCES profiles(id),
  used_by        UUID REFERENCES profiles(id),
  used_at        TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Points Ledger ─────────────────────────────────────────
-- One row per user per month. Upsert on every point event.

CREATE TABLE IF NOT EXISTS points_ledger (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  month        TEXT NOT NULL,   -- 'YYYY-MM'
  points       INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (household_id, user_id, month)
);

-- ─── Tasks ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical','high','medium','low')),
  status       TEXT NOT NULL DEFAULT 'todo'   CHECK (status   IN ('todo','in_progress','waiting','completed','archived')),
  assigned_to  UUID REFERENCES profiles(id),
  created_by   UUID NOT NULL REFERENCES profiles(id),
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Chores ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chores (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  room            TEXT,
  target_per_week INT NOT NULL DEFAULT 1,
  created_by      UUID NOT NULL REFERENCES profiles(id),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Chore Logs ────────────────────────────────────────────
-- Edit-not-delete: deleted_at is a soft delete.
-- Every edit writes to activity_logs with old/new values.

CREATE TABLE IF NOT EXISTS chore_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chore_id     UUID NOT NULL REFERENCES chores(id) ON DELETE CASCADE,
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES profiles(id),
  notes        TEXT,
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Reminders ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reminders (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id  UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  note          TEXT,
  assigned_to   UUID REFERENCES profiles(id),
  due_date      TIMESTAMPTZ NOT NULL,
  recurrence    TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none','daily','weekly','monthly')),
  snoozed_until TIMESTAMPTZ,
  is_done       BOOLEAN NOT NULL DEFAULT false,
  deleted_at    TIMESTAMPTZ,
  created_by    UUID NOT NULL REFERENCES profiles(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Notes ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id   UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  title          TEXT NOT NULL DEFAULT 'Untitled Note',
  content        TEXT NOT NULL DEFAULT '',
  highlights     JSONB NOT NULL DEFAULT '[]',
  created_by     UUID NOT NULL REFERENCES profiles(id),
  last_edited_by UUID REFERENCES profiles(id),
  deleted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Activity Logs ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS activity_logs (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id),
  action       TEXT NOT NULL,
  entity_type  TEXT NOT NULL,
  entity_id    UUID NOT NULL,
  entity_title TEXT,
  old_values   JSONB,
  new_values   JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_hm_household   ON household_members(household_id);
CREATE INDEX IF NOT EXISTS idx_hm_user        ON household_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hh       ON tasks(household_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_chores_hh      ON chores(household_id);
CREATE INDEX IF NOT EXISTS idx_chore_logs_hh  ON chore_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_chore_logs_chore ON chore_logs(chore_id);
CREATE INDEX IF NOT EXISTS idx_reminders_hh   ON reminders(household_id);
CREATE INDEX IF NOT EXISTS idx_notes_hh       ON notes(household_id);
CREATE INDEX IF NOT EXISTS idx_activity_hh    ON activity_logs(household_id);
CREATE INDEX IF NOT EXISTS idx_activity_ts    ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_month   ON points_ledger(household_id, month);

-- ─── updated_at trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON profiles       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON households     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON tasks         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON chores        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON chore_logs    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON reminders     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON notes         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON points_ledger FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Auto-create profile on signup ────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email,'@',1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Award points helper ───────────────────────────────────
-- Called from application code via RPC or directly.

CREATE OR REPLACE FUNCTION award_points(
  p_household_id UUID,
  p_user_id      UUID,
  p_points       INT,
  p_month        TEXT DEFAULT to_char(now(),'YYYY-MM')
)
RETURNS void AS $$
BEGIN
  INSERT INTO points_ledger (household_id, user_id, month, points)
  VALUES (p_household_id, p_user_id, p_month, p_points)
  ON CONFLICT (household_id, user_id, month)
  DO UPDATE SET points = points_ledger.points + p_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
