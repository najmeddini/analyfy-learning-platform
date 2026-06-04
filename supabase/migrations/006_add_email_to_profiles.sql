-- Migration 006: Add email column to public.profiles
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. ADD COLUMN
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. BACKFILL — copy email from auth.users for all existing users
UPDATE public.profiles p
SET    email = u.email
FROM   auth.users u
WHERE  p.user_id = u.id
  AND  p.email IS NULL;

-- 3. UPDATE TRIGGER FUNCTION — insert email on every new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- (The trigger on_auth_user_created already exists — no need to recreate it)
