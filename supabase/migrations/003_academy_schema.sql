-- ============================================================
-- Migration 003: Analyfy Academy schema expansions
-- ============================================================

-- 1. Extend profiles with public profile fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS expertise TEXT;

-- Unique constraint on username (case-insensitive handled at app level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_unique'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
  END IF;
END $$;

-- 2. Extend user_progress with lesson_title cache and last_reviewed
ALTER TABLE public.user_progress
  ADD COLUMN IF NOT EXISTS lesson_title TEXT,
  ADD COLUMN IF NOT EXISTS last_reviewed TIMESTAMPTZ DEFAULT NOW();

-- Update last_reviewed trigger: keep it current on each upsert
CREATE OR REPLACE FUNCTION public.update_last_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_reviewed = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_last_reviewed ON public.user_progress;
CREATE TRIGGER trg_update_last_reviewed
  BEFORE INSERT OR UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_last_reviewed();

-- 3. Course ratings table
CREATE TABLE IF NOT EXISTS public.course_ratings (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id   TEXT        NOT NULL,  -- Notion course page ID
  rating      SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.course_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings"
  ON public.course_ratings FOR SELECT USING (true);

CREATE POLICY "Users manage own rating"
  ON public.course_ratings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Add project_id (Notion Projects DB page ID) to projects table
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS project_id TEXT;  -- Notion Projects DB page ID (nullable for legacy rows)

-- 5. Index for fast profile lookup by username
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- 6. Index for course ratings aggregation
CREATE INDEX IF NOT EXISTS idx_course_ratings_course ON public.course_ratings(course_id);

-- 7. Index for recent threads query
CREATE INDEX IF NOT EXISTS idx_user_progress_last_reviewed
  ON public.user_progress(user_id, last_reviewed DESC);
