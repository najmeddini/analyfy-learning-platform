@AGENTS.md

# آکادمی آنالیفای — راهنمای Claude

## ⚠️ قوانین ثابت (هرگز نقض نشوند)

1. **اطلاعات حساس**: هرگز از کاربر نخواه API key یا credential را در چت paste کند. همه credentials فقط در `.env.local` (gitignored) قرار می‌گیرند. هرگز `.env.local` را commit یا share نکن.
2. **زبان کد**: تمام کد به انگلیسی. متن‌های UI به فارسی (RTL).
3. **این Next.js 16.2.6 + React 19 است** — رفتار ممکن است با نسخه‌های قدیمی‌تر فرق داشته باشد. قبل از نوشتن کد، `node_modules/next/dist/docs/` را چک کن.
4. **Dev server روی port 3001**: `npm run dev` — port در `package.json` با `-p 3001` ثابت شده. هرگز بدون flag اجرا نکن چون port 3000 اشغال برنامه دیگری است.
5. **بعد از هر تغییر فاینال**: CLAUDE.md آپدیت + git commit + push.
6. **هر تغییر schema دیتابیس**: یک فایل migration در `supabase/migrations/` بساز و commit کن. Repository تنها منبع حقیقت schema است.

---

## استقرار (Deployment)

- **Production URL**: `https://academy.analyfy.me`
- **GitHub Repo**: `https://github.com/najmeddini/analyfy-learning-platform`
- **Vercel**: پروژه به Vercel وصل است و از GitHub auto-deploy می‌کند
- **`NEXT_PUBLIC_SITE_URL`** در Vercel باید `https://academy.analyfy.me` باشد (نه localhost)
- **env variables**: همه باید در Vercel Dashboard → Settings → Environment Variables تنظیم شوند

---

## وضعیت فعلی پروژه

### ✅ تکمیل‌شده
- [x] احراز هویت (magic link + Google OAuth)
- [x] دوره‌ها از Notion با ISR (`unstable_cache`)
- [x] سیستم درس ChatGPT-style با انیمیشن typewriter
- [x] کوییز چندگزینه‌ای (فیلد `Quiz_Content` جدا)
- [x] "درس بعدی" با URL سلسله‌مراتبی واقعی (`getNextLessonUrl`)
- [x] Slug ۵ کاراکتری: `/course/{slug}-{5char}/lesson/{slug}-{5char}`
- [x] `getLessonBySlug` و `getNextLessonUrl` (بدون UUID reconstruction)
- [x] `searchLessons` با URL کامل در نتایج
- [x] SearchModal با `result.url` (نه `/learn/[id]`)
- [x] History page با `course_slug`/`lesson_slug`
- [x] Migration 004 — `user_progress` با `course_slug` + `lesson_slug` (اجرا شده)
- [x] حذف `/learn/[lessonId]` route
- [x] Sidebar با URL سلسله‌مراتبی از DB
- [x] لوگوی واحد (`/logo.webp`) در همه تم‌ها — `Logo.tsx` ساده‌سازی شد
- [x] `proxy.ts` (جایگزین `middleware.ts`)
- [x] Node.js heap 4GB در dev (`NODE_OPTIONS=--max-old-space-size=4096`)
- [x] پروفایل عمومی `/user/[username]`
- [x] پنل ادمین + org-admin
- [x] Bounty badge و prize
- [x] JSON-LD structured data
- [x] GuestTeaser با ۳ کامنت عمومی
- [x] صفحات: history، projects، certificate، sponsors
- [x] Route group `(marketing)` — لندینگ پیج بدون sidebar
- [x] لندینگ پیج MVP با glassmorphism، gradient، Viral Content Framework
- [x] Light mode اجباری — `@variant dark` در globals.css غیرفعال
- [x] Smart auto-scroll با ResizeObserver (جایگزین scrollIntoView fighting)
- [x] placeholder چت: `"سوالتو بپرس یا کامنت بذار..."`
- [x] Comment persistence — POST/GET `/api/comments` + optimistic UI + rollback
- [x] Migration 005 — RLS policies برای `comments` (فایل در repo، اجرا در Supabase Dashboard)
- [x] Migration 006 — `email` column در `profiles` + backfill + trigger آپدیت (فایل در repo)
- [x] Migration 007 — `course_id`, `lesson_id`, `parent_id` در `comments` (فایل در repo)
- [x] Admin comments dashboard `/admin/comments` با service role
- [x] Admin CommentsTable — فیلتر text/status/course/lesson/privacy/thread، Bulk Approve، Quick Reply inline
- [x] Server Action `replyAndApprove` — insert reply + auto-approve اصلی
- [x] Server Action `bulkApproveComments(ids[])` — batch approve در یک query
- [x] Comment fetching bug fix — حذف profiles join شکسته، two-query pattern، `is_own` flag
- [x] GET /api/comments — enriched با display_name + is_own (بدون profiles FK)
- [x] LessonChatShell — own comments در chat، community Q&As در side drawer جداگانه
- [x] GuestTeaser — ۳ جدیدترین approved+public Q&A + CTA بهبودیافته
- [x] همه متون UI: "نظرات"/"بازتاب" → "پرسش و پاسخ"

### ⚠️ باید کاربر انجام دهد (به ترتیب)
- [ ] **Migration 005** — `supabase/migrations/005_comments_rls.sql`
- [ ] **Migration 006** — `supabase/migrations/006_add_email_to_profiles.sql`
- [ ] **Migration 007** — `supabase/migrations/007_upgrade_comments.sql`

---

## معماری پروژه

### Stack
- **Next.js 16.2.6** — App Router, Server Components
- **React 19.2.4**
- **Supabase** — Auth + PostgreSQL
- **Notion** — CMS (دوره‌ها، مباحث، درس‌ها، پروژه‌ها)
- **Tailwind CSS v4**
- **Framer Motion** — انیمیشن چت
- **Vazirmatn** — فونت فارسی
- **lucide-react** — آیکون‌ها

### ساختار فایل‌های مهم
```
src/
├── proxy.ts
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx                     # Navbar glassmorphism + footer
│   │   └── page.tsx                       # Landing page (route /)
│   ├── (main)/
│   │   ├── layout.tsx                     # Sidebar + main wrapper
│   │   ├── explore/page.tsx
│   │   ├── course/[courseSlug]/
│   │   │   ├── page.tsx
│   │   │   └── lesson/[lessonSlug]/page.tsx
│   │   ├── history/page.tsx
│   │   ├── projects/page.tsx
│   │   ├── certificate/page.tsx
│   │   ├── sponsors/page.tsx
│   │   ├── settings/page.tsx
│   │   ├── user/[username]/page.tsx
│   │   ├── admin/page.tsx
│   │   ├── admin/comments/
│   │   │   ├── page.tsx                   # Server Component — data fetching
│   │   │   ├── CommentsTable.tsx          # Client Component — filters + reply UI
│   │   │   └── actions.ts                 # Server Actions: approve/reject/replyAndApprove
│   │   └── org-admin/page.tsx
│   ├── api/
│   │   ├── progress/route.ts
│   │   ├── comments/route.ts              # GET: RLS-delegated; POST: insert + course_id/lesson_id
│   │   ├── projects/route.ts
│   │   ├── ratings/route.ts
│   │   ├── search/route.ts
│   │   ├── certificates/route.ts
│   │   └── admin/
│   └── login/page.tsx
├── components/
│   ├── chat/
│   │   ├── LessonChatShell.tsx            # درس + comment persistence + courseSlug/lessonSlug در POST
│   │   ├── ChatArea.tsx                   # ResizeObserver smart scroll
│   │   ├── ChatBubble.tsx
│   │   ├── LessonContent.tsx
│   │   ├── QuizWidget.tsx
│   │   ├── FileUploadWidget.tsx
│   │   └── GuestTeaser.tsx
│   ├── sidebar/Sidebar.tsx
│   └── ui/
│       ├── Logo.tsx
│       ├── SearchModal.tsx
│       ├── StarRating.tsx
│       ├── BountyBadge.tsx
│       └── JsonLd.tsx
├── lib/
│   ├── notion/client.ts
│   ├── notion/blocks.ts
│   ├── supabase/client.ts
│   ├── supabase/server.ts                 # createClient + createServiceClient
│   └── utils.ts
└── types/index.ts
```

---

## Supabase Migrations

| فایل | وضعیت | محتوا |
|---|---|---|
| `001_initial.sql` | ✅ اجرا شده | schema اولیه + comments + profiles + trigger |
| `002_b2b_and_bounties.sql` | ✅ اجرا شده | B2B + bounty |
| `003_academy_schema.sql` | ✅ اجرا شده | schema آکادمی |
| `004_progress_slugs.sql` | ✅ اجرا شده | course_slug + lesson_slug |
| `005_comments_rls.sql` | ⚠️ اجرا شود | RLS policies برای comments |
| `006_add_email_to_profiles.sql` | ⚠️ اجرا شود | email در profiles + backfill + trigger |
| `007_upgrade_comments.sql` | ⚠️ اجرا شود | course_id, lesson_id, parent_id در comments |

---

## Comment System — معماری کامل

### Schema (جدول `comments`)
```
id               uuid PK
user_id          uuid → auth.users
topic_id         text NOT NULL          (Notion topic ID)
course_id        text NULL              (migration 007 — courseSlug)
lesson_id        text NULL              (migration 007 — lessonSlug)
parent_id        uuid NULL → comments   (migration 007 — threading)
content          text NOT NULL
is_public_consent boolean default false
status           text: pending/approved/rejected
created_at       timestamptz
```

### API
- **POST** `/api/comments`: insert با `user_id`, `topic_id`, `course_id`, `lesson_id`, `status: 'pending'`
- **GET** `/api/comments?topic_id=X`: RLS تصمیم می‌گیره (own OR approved+public)

### LessonChatShell
- `handleSendComment`: courseSlug + lessonSlug رو با کامنت ارسال می‌کنه
- `loadComments()`: بعد از `runLesson()` کامنت‌های DB لود و inject می‌شن
- **Optimistic UI**: temp id → real DB id، rollback + error banner در صورت failure

### Admin `/admin/comments`
- **page.tsx**: Server Component، service role، دو query جداگانه (comments + profiles) + merge
- **CommentsTable.tsx**: Client Component — فیلتر status/course، ستون Location، Quick Reply
- **actions.ts**: `approveComment`, `rejectComment`, `replyAndApprove`
  - `replyAndApprove`: insert reply با `parent_id` + auto-approve کامنت اصلی

### نکته مهم: FK مستقیم بین comments و profiles وجود ندارد
`comments.user_id → auth.users` و `profiles.user_id → auth.users`
PostgREST نمی‌تواند `profiles(...)` را روی comments join کند.
**راه‌حل**: همیشه دو query جداگانه + merge در JS.

---

## Logo Component

```tsx
<img src="/logo.webp" alt="آکادمی آنالیفای" width={size} height={size} />
```
فایل: `public/logo.webp` — commit شده در git.

---

## سیستم URL و Slug

```
/course/{title-slug}-{5char}/lesson/{title-slug}-{5char}
```
```typescript
export function makeRouteSlug(title: string, notionId: string): string {
  const hash5 = notionId.replace(/-/g, '').slice(0, 5);
  return `${slugify(title)}-${hash5}`;
}
// Slug Resolution:
const course = courses.find(c => c.slug === courseSlug); // نه UUID reconstruction
```

---

## Theme — Light Mode اجباری

```css
@variant dark (&:where(.dark, .dark *));
```
هرگز `dark:` Tailwind class اضافه نکن. همه رنگ‌ها explicit light-only.

---

## Notion Client

```typescript
const REVALIDATE_TIME = parseInt(process.env.REVALIDATE_TIME || '60', 10);
const _getCourses = unstable_cache(async () => { /* ... */ }, ['notion-courses'], { revalidate: REVALIDATE_TIME });
```
مشکل رایج: فیلد **Status** در Notion باید **Published** باشد.

---

## الگوهای ❌/✅

```typescript
// ❌ middleware.ts  →  ✅ proxy.ts
// ❌ export const revalidate در lib  →  ✅ unstable_cache
// ❌ UUID reconstruction  →  ✅ courses.find(c => c.slug === slug)
// ❌ /learn/[lessonId]  →  ✅ /course/[courseSlug]/lesson/[lessonSlug]
// ❌ dark: Tailwind  →  ✅ explicit light colors
// ❌ scrollIntoView smooth  →  ✅ ResizeObserver + el.scrollTop = el.scrollHeight
// ❌ profiles(...) join on comments  →  ✅ دو query جداگانه + merge
```

---

## متغیرهای محیطی

```
NOTION_TOKEN=
NOTION_COURSES_DB_ID=
NOTION_TOPICS_DB_ID=
NOTION_LESSONS_DB_ID=
NOTION_PROJECTS_DB_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001   # در Vercel: https://academy.analyfy.me
REVALIDATE_TIME=60
```
