# PROJECT MEMORY — Unbreakable Rules
> This file exists so Claude never forgets critical architectural decisions.
> Read this before touching any of the files listed below.

---

## RULE 1 — Admin Panel (`/admin/comments/page.tsx`)
- MUST use `createServiceClient()` (which uses `SUPABASE_SERVICE_ROLE_KEY`) to **bypass RLS completely**.
- MUST use `select('*')` for the comments query — **never** an explicit column list.
  - Reason: an explicit list like `select('id,...,course_id,lesson_id,parent_id')` will
    return a Postgres 400 error if migration 007 hasn't been applied yet
    (those columns don't exist). This silently empties the admin table.
- Profiles are fetched in a **separate second query** and merged in JS — there is **no direct FK**
  between `comments.user_id` and `profiles.user_id` in PostgREST.
  Do NOT use `.select('*, profiles(...)')` — it will fail.
- A missing profile MUST render as **"کاربر ناشناس"** — the `?? null` fallback in CommentsTable handles this.

## RULE 2 — System/Admin Bubbles (`ChatBubble.tsx` → `SystemBubble`)
- ALL system messages AND admin replies MUST use `<img src="/logo.webp" />` as the avatar.
  **Never** use `message.avatarUrl` for system messages.
- `isReply={true}` messages MUST be visually distinct:
  - `mr-10` indentation (RTL-friendly)
  - Background: `#eef2ff` (light indigo)
  - Right border: `border-r-2 border-indigo-300`
  - Purple pill badge **"پشتیبانی آنالیفای"** above reply text
- Admin replies come from `loadComments()` in `LessonChatShell` where:
  - `role = 'system'`, `isReply = true`, `avatarUrl = '/logo.webp'`

## RULE 3 — Anti-Spam Link Handling (`ChatBubble.tsx`)
- **User bubbles** (`role === 'user'`): render content via `<PlainUserText>` component.
  - `white-space: pre-wrap`, `word-break: break-word`.
  - NO `dangerouslySetInnerHTML`. NO markdown parsing. URLs stay as inert plain text.
- **System/admin bubbles** (`role === 'system'`): render via `<LessonContent>` (trusted source).
  - Uses `dangerouslySetInnerHTML`. Markdown links → `<a target="_blank">`.

## RULE 4 — Pending Status (`ChatMessage` type + `ChatBubble.tsx`)
- `ChatMessage` has `status?: 'pending' | 'approved' | 'rejected'` field.
- `LessonChatShell/loadComments`: MUST pass `status: c.status` for own comments.
  **NEVER** concatenate `"در انتظار تأیید..."` into `message.content`.
- `LessonChatShell/handleSendComment`: optimistic message MUST have `status: 'pending'`.
- `ChatBubble`: render `<span className="text-xs text-slate-400 mr-9 mt-0.5">در انتظار تأیید...</span>`
  **below** the bubble row (not inside the text), only when `message.status === 'pending'`.

## RULE 5 — Data Fetching: Always Bypass RLS for Profile Enrichment

**DATA FETCHING RULE:** Whenever querying user-generated content (comments,
replies, etc.) and then enriching it with author identity from `profiles`
(display_name, avatar_url), the **profiles sub-query MUST use the vanilla
`@supabase/supabase-js` service-role client**, never the SSR anon client.

**Why:** The RLS policy `"profiles: own read"` restricts
`supabase.from('profiles')` (anon/SSR client) to returning only the currently
authenticated user's own row.  Queries for other users' profiles silently
return empty — causing `display_name` and `avatar_url` to be `null` for every
commenter except the viewer themselves.

**Pattern (copy-paste template):**
```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

const serviceClient = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const { data: profiles } = await serviceClient
  .from('profiles')
  .select('user_id, display_name, avatar_url')
  .in('user_id', userIds);
```

**Also add** `export const dynamic = 'force-dynamic'` to any API route that
returns user-generated content, to prevent stale cached responses.

**PostgREST join note:** `.select('*, profiles(display_name, avatar_url)')` does
NOT work — there is no direct FK between `comments.user_id` and `profiles.user_id`
in PostgREST.  Always use the two-query + JS merge pattern.

---

## Additional Invariants

| Rule | File | Detail |
|------|------|--------|
| No `profiles(...)` join | All queries | FK goes `comments→auth.users` and `profiles→auth.users` — no direct join |
| `/logo.webp` for system | `ChatBubble.tsx` | Never use adminProfile.avatar_url |
| `select('*')` in admin | `admin/comments/page.tsx` | Robust against unrun migrations |
| RTL layout | All UI | `dark:` Tailwind classes are disabled. `@variant dark` is disabled in globals.css |
| Port 3001 | Dev | `npm run dev` — port hardcoded in package.json, never run without `-p 3001` |
| Two-query profile merge | API routes + admin | Always separate queries, merge in JS |
