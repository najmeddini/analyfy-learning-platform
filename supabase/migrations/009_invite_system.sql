-- ============================================================
-- Migration 009: Invite-Only System
-- ============================================================
-- Run in Supabase Dashboard → SQL Editor

-- ── 1. Extend profiles ──────────────────────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS invite_code        TEXT        UNIQUE,
  ADD COLUMN IF NOT EXISTS invite_quota       INTEGER     NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS invited_by         UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_created_at  TIMESTAMPTZ NOT NULL DEFAULT now();

-- ── 2. Waitlist table ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS waitlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert their own email into the waitlist (no auth needed)
DROP POLICY IF EXISTS "waitlist: public insert" ON waitlist;
CREATE POLICY "waitlist: public insert"
  ON waitlist FOR INSERT
  WITH CHECK (true);

-- ── 3. Backfill invite_code for existing profiles ───────────
-- Pattern: first 4 uppercase letters of email + 4 random digits
UPDATE profiles p
SET invite_code = (
  SELECT
    upper(substring(u.email FROM '^[A-Za-z]{1,4}')) ||
    lpad(floor(random() * 10000)::int::text, 4, '0')
  FROM auth.users u
  WHERE u.id = p.user_id
)
WHERE invite_code IS NULL;

-- ── 4. Update handle_new_user trigger to generate invite_code ─
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _code TEXT;
  _attempt INT := 0;
BEGIN
  -- Generate a unique invite code: up to 4 letters from email + 4 digits
  LOOP
    _code := upper(substring(NEW.email FROM '^[A-Za-z]{1,4}'))
             || lpad(floor(random() * 10000)::int::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE invite_code = _code);
    _attempt := _attempt + 1;
    EXIT WHEN _attempt > 20; -- safety: give up after 20 collisions (astronomically rare)
  END LOOP;

  INSERT INTO public.profiles (
    user_id,
    email,
    display_name,
    role,
    invite_code,
    invite_quota,
    invite_created_at
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

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
