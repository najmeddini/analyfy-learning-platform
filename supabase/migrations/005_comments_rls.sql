-- Migration 005: RLS policies for the `comments` table
-- Run manually in Supabase Dashboard → SQL Editor
-- (Supabase CLI auto-apply not configured; this file is version-control only)

-- 1. Enable RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- 2. Drop old policies if they exist (idempotent)
DROP POLICY IF EXISTS "Users can insert their own comments"       ON comments;
DROP POLICY IF EXISTS "Users can read approved or own comments"   ON comments;
DROP POLICY IF EXISTS "Admins can update comment status"         ON comments;

-- 3. INSERT: authenticated users may only insert rows as themselves
CREATE POLICY "Users can insert their own comments"
ON comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 4. SELECT:
--   • Approved + public-consent comments are visible to everyone (including guests)
--   • Authors can always see their own comments regardless of status
CREATE POLICY "Users can read approved or own comments"
ON comments FOR SELECT
USING (
  (status = 'approved' AND is_public_consent = true)
  OR
  user_id = auth.uid()
);

-- 5. UPDATE: only admins / org-admins may change status
--   (admin panel uses service-role key which bypasses RLS,
--    but this policy guards against privilege escalation via anon key)
CREATE POLICY "Admins can update comment status"
ON comments FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'org_admin')
  )
);
