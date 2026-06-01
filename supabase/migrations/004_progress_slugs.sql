-- Migration 004: add course_slug and lesson_slug to user_progress
-- These allow sidebar and history page to build hierarchical URLs
-- (/course/[courseSlug]/lesson/[lessonSlug]) without an extra Notion lookup.

ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS course_slug TEXT,
  ADD COLUMN IF NOT EXISTS lesson_slug TEXT;

-- Index speeds up sidebar query (filter non-null + order by last_reviewed)
CREATE INDEX IF NOT EXISTS idx_user_progress_slugs
  ON user_progress (user_id, course_slug, lesson_slug)
  WHERE course_slug IS NOT NULL AND lesson_slug IS NOT NULL;
