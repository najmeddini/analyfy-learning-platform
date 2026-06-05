-- ============================================================
-- Migration 009: Fix invite_code generation in handle_new_user
-- ============================================================
-- Problem: the previous trigger used a regex anchor that stopped
-- at the first non-letter character (e.g. "a.najmeddini@gmail.com"
-- produced just "A" instead of "ANAJ").
--
-- Fix:
--   1. Extract the local part (everything before @).
--   2. Strip ALL non-alphanumeric characters with REGEXP_REPLACE.
--   3. Take the first 4 characters (uppercase).
--   4. Append exactly 3 random digits → 7-char code, e.g. "ANAJ832".
--   5. Use a WHILE EXISTS loop to guarantee uniqueness.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _local   TEXT;   -- email local part (before @)
  _letters TEXT;   -- up to 4 alphanumeric chars, uppercased
  _code    TEXT;   -- final 7-char invite code
BEGIN
  -- 1. Extract local part and strip non-alphanumeric characters
  _local   := split_part(NEW.email, '@', 1);
  _letters := upper(left(regexp_replace(_local, '[^a-zA-Z0-9]', '', 'g'), 4));

  -- Edge case: email local part is entirely symbols → use 'USER'
  IF _letters = '' THEN
    _letters := 'USER';
  END IF;

  -- 2. Generate a unique code: letters + 3 random digits
  --    Loop until no collision exists (statistically resolves in 1-2 tries).
  _code := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
  WHILE EXISTS (SELECT 1 FROM profiles WHERE invite_code = _code) LOOP
    _code := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
  END LOOP;

  -- 3. Upsert profile (handles both new signups and social-auth re-triggers)
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

-- Re-attach trigger (drop + create is idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Backfill: fix existing profiles that got a short/bad code ─
-- Only touches rows where invite_code is shorter than 5 chars
-- (4-letter + 3-digit minimum is 7, but we're lenient to catch
-- single-letter codes like "A4567" from the old regex).
DO $$
DECLARE
  rec       RECORD;
  _local    TEXT;
  _letters  TEXT;
  _newcode  TEXT;
BEGIN
  FOR rec IN
    SELECT p.user_id, u.email
    FROM profiles p
    JOIN auth.users u ON u.id = p.user_id
    WHERE length(p.invite_code) < 5
       OR p.invite_code IS NULL
  LOOP
    _local   := split_part(rec.email, '@', 1);
    _letters := upper(left(regexp_replace(_local, '[^a-zA-Z0-9]', '', 'g'), 4));
    IF _letters = '' THEN _letters := 'USER'; END IF;

    _newcode := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
    WHILE EXISTS (
      SELECT 1 FROM profiles
      WHERE invite_code = _newcode AND user_id <> rec.user_id
    ) LOOP
      _newcode := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
    END LOOP;

    UPDATE profiles SET invite_code = _newcode WHERE user_id = rec.user_id;
  END LOOP;
END;
$$;
