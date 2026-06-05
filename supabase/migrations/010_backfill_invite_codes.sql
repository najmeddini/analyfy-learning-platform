-- ============================================================
-- Migration 010: Backfill broken/missing invite codes
-- ============================================================
-- Targets every profile where invite_code is:
--   • NULL
--   • not exactly 7 characters
--   • contains non-alphanumeric characters (dots, dashes, etc.)
--
-- Generates: up to 4 uppercase alphanumeric letters from the email
--            local part (dots/dashes stripped) + exactly 3 random
--            digits.  Uses a WHILE EXISTS loop for strict uniqueness.
-- ============================================================

DO $$
DECLARE
  rec      RECORD;
  _local   TEXT;
  _letters TEXT;
  _newcode TEXT;
BEGIN
  FOR rec IN
    SELECT p.user_id, u.email
    FROM   profiles p
    JOIN   auth.users u ON u.id = p.user_id
    WHERE  p.invite_code IS NULL
       OR  length(p.invite_code) != 7
       OR  p.invite_code ~ '[^a-zA-Z0-9]'
  LOOP
    -- Strip non-alphanumeric chars from the local part of the email
    _local   := split_part(rec.email, '@', 1);
    _letters := upper(left(regexp_replace(_local, '[^a-zA-Z0-9]', '', 'g'), 4));

    -- Fallback for edge-case emails that are entirely symbols
    IF _letters = '' THEN
      _letters := 'USER';
    END IF;

    -- Generate a 7-char code; loop until it is strictly unique
    _newcode := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
    WHILE EXISTS (
      SELECT 1 FROM profiles
      WHERE  invite_code = _newcode
        AND  user_id <> rec.user_id
    ) LOOP
      _newcode := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
    END LOOP;

    UPDATE profiles
    SET    invite_code = _newcode
    WHERE  user_id = rec.user_id;
  END LOOP;
END;
$$;
