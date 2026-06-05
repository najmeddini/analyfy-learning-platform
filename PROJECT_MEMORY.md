# PROJECT MEMORY — Unbreakable Rules
> This file exists so Claude never forgets critical architectural decisions.
> Read this before touching any of the files listed below.
> Last updated: 2026-06-06

---

## RULE 1 — Admin Panel queries (service role, `select('*')`)
- ALL admin data-fetching pages (`/admin/comments`, `/admin/invites`, etc.) MUST use
  the **vanilla `@supabase/supabase-js` client** with `SUPABASE_SERVICE_ROLE_KEY` to
  bypass RLS completely.  Do NOT use `createServiceClient()` from `@supabase/ssr` —
  it passes the session JWT alongside the service key which some Supabase configs
  honour, restricting rows.
  ```ts
  import { createClient as createSupabaseClient } from '@supabase/supabase-js';
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  ```
- MUST use `select('*')` for the comments query — **never** an explicit column list.
  Reason: an explicit list will error with Postgres 42703 if any migration hasn't run yet.
- A missing profile MUST render as **"کاربر ناشناس"** — never crash on null profile.

## RULE 2 — profiles table: PK is `user_id`, NOT `id`
- `profiles` primary key is `user_id uuid` (references `auth.users(id)`).
- There is **no `id` column** on `profiles`.
- All foreign keys referencing profiles MUST be `REFERENCES profiles(user_id)`.
- RLS policies on tables that join profiles MUST use `auth.uid()` directly:
  ```sql
  USING (user_id = auth.uid())   -- ✅ correct
  USING (user_id = (SELECT id FROM profiles ...))  -- ❌ will error: column "id" doesn't exist
  ```

## RULE 3 — Profile enrichment: ALWAYS use service-role client
- The RLS policy `"profiles: own read"` restricts `supabase.from('profiles')`
  (anon/SSR client) to only the currently authenticated user's own row.
- **Any** query that needs display_name/avatar_url for multiple users MUST use
  the vanilla service-role client for the profiles sub-query.
- PostgREST join `.select('*, profiles(display_name, avatar_url)')` does **NOT work** —
  there is no direct FK between `comments.user_id` and `profiles.user_id`.
  Always use the **two-query + JS merge pattern**:
  ```ts
  // 1. Fetch content with the regular client (respects RLS for content)
  const { data: comments } = await supabase.from('comments').select(...);

  // 2. Fetch profiles with service-role client (bypasses RLS)
  const serviceClient = createSupabaseClient(URL, SERVICE_ROLE_KEY);
  const { data: profiles } = await serviceClient
    .from('profiles').select('user_id, display_name, avatar_url')
    .in('user_id', userIds);

  // 3. Merge in JS
  const profileMap = Object.fromEntries(profiles.map(p => [p.user_id, p]));
  ```
- Add `export const dynamic = 'force-dynamic'` to every API route returning
  user-generated content to prevent stale caches.

## RULE 4 — System/Admin bubbles (`ChatBubble.tsx` → `SystemBubble`)
- ALL system messages AND admin replies MUST use `<img src="/logo.webp" />` as avatar.
  **Never** use `message.avatarUrl` for system messages.
- `isReply={true}` messages: indented (`mr-10`), background `#eef2ff`, right border
  `border-r-2 border-indigo-300`, purple pill badge **"پشتیبانی آنالیفای"** above text.
- Admin replies from `loadComments()`: `role='system'`, `isReply=true`, `avatarUrl='/logo.webp'`
- Admin reply plain text → render via `<LinkifiedText>` (URLs become clickable `<a>`).
- Lesson content / quiz feedback → render via `<LessonContent>` (trusted HTML).
- User bubbles → render via `<PlainUserText>` (NO links, NO HTML — anti-spam).
- Name header above user bubble: only shown when `message.status === undefined`
  (i.e., someone else's message). Own messages always have status set → header hidden.

## RULE 5 — Pending status (`ChatMessage` + `ChatBubble.tsx`)
- `ChatMessage.status?: 'pending' | 'approved' | 'rejected'` — only set for own messages.
- `loadComments()`: MUST pass `status: c.status` for own comments. NEVER append
  `"در انتظار تأیید..."` to `message.content`.
- Optimistic message from `handleSendComment`: MUST have `status: 'pending'`.
- Pending indicator renders **below** the bubble row as a separate `<span>`.

## RULE 6 — Invite system architecture
- `profiles` has: `invite_code TEXT UNIQUE`, `invite_quota INT DEFAULT 10`,
  `invited_by UUID REFERENCES profiles(user_id)`, `invite_created_at TIMESTAMPTZ`.
- Invite code format: **7 chars** — up to 4 uppercase alphanumeric chars from email
  local part (dots/dashes stripped via `regexp_replace`) + exactly 3 random digits.
  Example: `a.najmeddini@gmail.com` → `ANAJ` + `832` → `ANAJ832`.
- Collision handling: **`WHILE EXISTS` loop** — never use a fixed retry count.
- Quota upgrade: reads `upgrade_levels` array from `system_settings` table
  (`key = 'invite_rules'`), advances to the **next tier strictly above** current quota.
  Upgrade only allowed within the **7-day window** (`now() - invite_created_at <= 7 days`).
- `invited_by` is written by `auth/callback/route.ts` after OTP exchange,
  passed as `?invited_by=<uuid>` query param in the magic-link redirect URL.

## RULE 7 — No `dark:` Tailwind classes
- Light mode is forced globally. `@variant dark` is disabled in `globals.css`.
- Never add `dark:` prefixed classes. All colours must be explicit light-only.

---

## Additional Invariants

| Rule | File | Detail |
|---|---|---|
| `profiles` PK = `user_id` | All migrations | Never `REFERENCES profiles(id)` |
| No `profiles(...)` join | All queries | Two-query + JS merge always |
| `/logo.webp` for system | `ChatBubble.tsx` | Never `message.avatarUrl` for system |
| `select('*')` in admin | `admin/*/page.tsx` | Robust against unrun migrations |
| 7-char invite codes | Trigger + backfill | `regexp_replace` strips dots before letters |
| Service-role for profiles | `api/comments/route.ts` + admin | RLS bypass required |
| `force-dynamic` | API routes with UGC | Prevents stale cache |
| RTL layout | All UI | `dir="rtl"` on containers, no `dark:` |
| Port 3001 | Dev | `-p 3001` in package.json, never omit |
