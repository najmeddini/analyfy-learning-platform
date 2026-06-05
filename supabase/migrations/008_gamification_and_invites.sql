-- ============================================================
-- Migration 009: Gamification, Invite System & Waitlist
-- ============================================================
-- Run in Supabase Dashboard → SQL Editor
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE).

-- ── 1. Waitlist ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist: public insert" ON waitlist;
CREATE POLICY "waitlist: public insert"
  ON waitlist FOR INSERT WITH CHECK (true);

-- ── 2. System settings (JSONB config, admin-editable) ───────
CREATE TABLE IF NOT EXISTS system_settings (
  id    UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  key   TEXT  NOT NULL UNIQUE,
  value JSONB NOT NULL
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_settings: public read" ON system_settings;
CREATE POLICY "system_settings: public read"
  ON system_settings FOR SELECT USING (true);

-- Seed default invite rules
INSERT INTO system_settings (key, value) VALUES (
  'invite_rules',
  '{"base_quota": 10, "upgrade_levels": [10, 20, 30, 50, 70, 100, 150, 200, 250, 300, 400, 500, 1000, 5000]}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── 3. Badges catalog ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS badges (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT  NOT NULL UNIQUE,
  level       INT   NOT NULL DEFAULT 1,
  color_theme TEXT  NOT NULL DEFAULT '#6c63ff',
  icon        TEXT  NOT NULL DEFAULT '🏅'
);

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges: public read" ON badges;
CREATE POLICY "badges: public read"
  ON badges FOR SELECT USING (true);

INSERT INTO badges (name, level, color_theme, icon) VALUES
  ('اولین درس',     1, '#22c55e', '🌱'),
  ('کنجکاو',        2, '#3b82f6', '🔍'),
  ('دانشجوی فعال',  3, '#f59e0b', '⚡'),
  ('مدعو موفق',     4, '#8b5cf6', '🤝'),
  ('پیشگام',        5, '#ec4899', '🚀')
ON CONFLICT (name) DO NOTHING;

-- ── 4. User badges (earned + privacy toggle) ─────────────────
-- NOTE: profiles PK is user_id (uuid), not id.
--       user_badges.user_id therefore references profiles(user_id),
--       which equals auth.uid() for the signed-in user — no subquery needed.
CREATE TABLE IF NOT EXISTS user_badges (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  badge_id   UUID        NOT NULL REFERENCES badges(id)        ON DELETE CASCADE,
  is_visible BOOLEAN     NOT NULL DEFAULT true,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Owner sees all their own badges (any visibility)
DROP POLICY IF EXISTS "user_badges: owner read" ON user_badges;
CREATE POLICY "user_badges: owner read"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

-- Public sees only badges the owner has marked visible
DROP POLICY IF EXISTS "user_badges: public visible read" ON user_badges;
CREATE POLICY "user_badges: public visible read"
  ON user_badges FOR SELECT USING (is_visible = true);

-- Owner can toggle their own badge visibility
DROP POLICY IF EXISTS "user_badges: owner update" ON user_badges;
CREATE POLICY "user_badges: owner update"
  ON user_badges FOR UPDATE
  USING (user_id = auth.uid());

-- ── 5. Extend profiles with invite columns ───────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code        TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_quota       INTEGER     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS invited_by         UUID        REFERENCES profiles(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_created_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 6. Backfill invite_code for existing profiles ────────────
UPDATE profiles p
SET invite_code = (
  SELECT upper(substring(u.email FROM '^[A-Za-z]{1,4}'))
         || lpad(floor(random() * 10000)::int::text, 4, '0')
  FROM auth.users u WHERE u.id = p.user_id
)
WHERE invite_code IS NULL;

-- ── 7. Update handle_new_user trigger ────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _code    TEXT;
  _attempt INT := 0;
BEGIN
  LOOP
    _code := upper(substring(NEW.email FROM '^[A-Za-z]{1,4}'))
             || lpad(floor(random() * 10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE invite_code = _code);
    _attempt := _attempt + 1;
    EXIT WHEN _attempt > 20;
  END LOOP;

  INSERT INTO public.profiles (
    user_id, email, display_name, role,
    invite_code, invite_quota, invite_created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    split_part(NEW.email, '@', 1),
    'student',
    _code,
    10,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email       = EXCLUDED.email,
        invite_code = COALESCE(profiles.invite_code, EXCLUDED.invite_code);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
