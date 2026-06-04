-- Migration 007: Upgrade comments table with context + threading
-- Run in Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────────────────────

-- 1. Context columns (TEXT because Notion IDs are strings, not pg UUIDs)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS course_id  TEXT,
  ADD COLUMN IF NOT EXISTS lesson_id  TEXT;

-- 2. Threading: parent_id references another comment (nullable)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id  UUID REFERENCES public.comments(id) ON DELETE SET NULL;

-- 3. Index for fast parent lookup (threaded replies)
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON public.comments(parent_id);

-- 4. Index for fast per-lesson fetches
CREATE INDEX IF NOT EXISTS comments_lesson_id_idx  ON public.comments(lesson_id);
CREATE INDEX IF NOT EXISTS comments_course_id_idx  ON public.comments(course_id);
