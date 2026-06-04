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

### ⚠️ باید کاربر انجام دهد
- [ ] **Migration 005** را در Supabase Dashboard → SQL Editor اجرا کن:
  - فایل: `supabase/migrations/005_comments_rls.sql`
  - RLS policies برای INSERT و SELECT و UPDATE جدول `comments`

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
├── proxy.ts                               # Auth middleware (نه middleware.ts!)
├── app/
│   ├── (marketing)/
│   │   ├── layout.tsx                     # Navbar glassmorphism + footer (بدون sidebar)
│   │   └── page.tsx                       # ← Landing page (route /)
│   ├── (main)/
│   │   ├── layout.tsx                     # Sidebar + main wrapper
│   │   ├── explore/page.tsx               # لیست دوره‌ها
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
│   │   └── org-admin/page.tsx
│   ├── api/
│   │   ├── progress/route.ts
│   │   ├── comments/route.ts              # GET: approved+public OR own; POST: insert
│   │   ├── projects/route.ts
│   │   ├── ratings/route.ts
│   │   ├── search/route.ts
│   │   ├── certificates/route.ts
│   │   └── admin/
│   └── login/page.tsx
├── components/
│   ├── chat/
│   │   ├── LessonChatShell.tsx            # کانتینر درس + comment persistence
│   │   ├── ChatArea.tsx                   # ResizeObserver smart scroll
│   │   ├── ChatBubble.tsx
│   │   ├── LessonContent.tsx
│   │   ├── QuizWidget.tsx
│   │   ├── FileUploadWidget.tsx
│   │   └── GuestTeaser.tsx
│   ├── sidebar/Sidebar.tsx
│   └── ui/
│       ├── Logo.tsx                       # ← <img src="/logo.webp"> ساده
│       ├── SearchModal.tsx
│       ├── StarRating.tsx                 # فقط در explore
│       ├── BountyBadge.tsx
│       └── JsonLd.tsx
├── lib/
│   ├── notion/client.ts                   # همه Notion API + unstable_cache
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
| `001_initial.sql` | ✅ اجرا شده | schema اولیه |
| `002_b2b_and_bounties.sql` | ✅ اجرا شده | B2B + bounty |
| `003_academy_schema.sql` | ✅ اجرا شده | schema آکادمی |
| `004_progress_slugs.sql` | ✅ اجرا شده | course_slug + lesson_slug |
| `005_comments_rls.sql` | ⚠️ باید اجرا شود | RLS policies برای `comments` |

---

## Logo Component

```tsx
// src/components/ui/Logo.tsx
// یک فایل واحد برای همه تم‌ها — logo.webp در public/
<img src="/logo.webp" alt="آکادمی آنالیفای" width={size} height={size} />
```

فایل لوگو در `public/logo.webp` — commit شده در git.

---

## سیستم URL و Slug

```
/course/{title-slug}-{5char}/lesson/{title-slug}-{5char}
مثال: /course/python-basics-370a8/lesson/variables-a1b2c
```

```typescript
// src/lib/utils.ts
export function makeRouteSlug(title: string, notionId: string): string {
  const hash5 = notionId.replace(/-/g, '').slice(0, 5);
  return `${slugify(title)}-${hash5}`;
}
```

**Slug Resolution:** چون فقط ۵ کاراکتر داریم، UUID قابل بازسازی نیست.
```typescript
const course = courses.find(c => c.slug === courseSlug); // نه UUID reconstruction
```

---

## Notion Client — الگوهای مهم

### چرا `unstable_cache`؟
Notion SDK از HTTP خودش استفاده می‌کند، نه fetch پچ‌شده Next.js. پس `export const revalidate` در library files کار نمی‌کند.

```typescript
const REVALIDATE_TIME = parseInt(process.env.REVALIDATE_TIME || '60', 10);

const _getCourses = unstable_cache(
  async (includeAll: boolean): Promise<Course[]> => { /* Notion API */ },
  ['notion-courses'],
  { revalidate: REVALIDATE_TIME }
);
```

### مشکل رایج: دوره نمایش داده نمی‌شود
→ فیلد **Status** در Notion باید روی **Published** باشد.

---

## Supabase Schema

```
profiles          — user info, role, org_id, username
user_progress     — lesson progress + course_slug + lesson_slug (migration 004)
comments          — بازتاب یادگیری (pending/approved/rejected) + RLS (migration 005)
projects          — پروژه‌های آپلودشده
course_ratings    — امتیاز دوره‌ها
organizations     — B2B
```

---

## Theme — Light Mode اجباری

```css
/* globals.css */
/* dark: utility classes فقط با .dark class روی ancestor فعال می‌شن */
/* چون هیچ‌جا .dark اضافه نمی‌کنیم، همه dark: classها غیرفعالن */
@variant dark (&:where(.dark, .dark *));
```

هرگز `dark:` Tailwind class در کامپوننت‌های جدید اضافه نکن.

---

## Comment System

- **POST** `/api/comments`: insert با `user_id`, `topic_id`, `content`, `status: 'pending'`
- **GET** `/api/comments?topic_id=X`: authenticated → approved+public OR own; guest → approved+public
- **LessonChatShell**: بعد از `runLesson()` کامنت‌های DB لود می‌شن و به messages اضافه می‌شن
- **Optimistic UI**: bubble با temp id → replace با real DB id بعد از موفقیت → rollback + error banner اگه fail شد

---

## الگوهای ❌/✅

```typescript
// ❌ middleware.ts — deprecated در Next.js 16، internal server error می‌دهد
// ✅ proxy.ts با export به نام `proxy`

// ❌ export const revalidate در library files — کار نمی‌کند
// ✅ unstable_cache با { revalidate: REVALIDATE_TIME }

// ❌ UUID reconstruction از ۵ کاراکتر
// ✅ courses.find(c => c.slug === courseSlug)

// ❌ /learn/[lessonId] — این route حذف شده
// ✅ /course/[courseSlug]/lesson/[lessonSlug]

// ❌ StarRating در lesson page
// ✅ StarRating فقط در explore

// ❌ dark: Tailwind classes — light mode اجباریه
// ✅ explicit light colors (text-slate-900, bg-white, etc.)

// ❌ scrollIntoView({ behavior: 'smooth' }) در typewriter loop
// ✅ ResizeObserver + el.scrollTop = el.scrollHeight (instant)

// ✅ Promise.all برای parallel fetching
const [nextUrl, supabase] = await Promise.all([getNextLessonUrl(...), createClient()]);
```

---

## متغیرهای محیطی

**`.env.local`** (local dev):
```
NOTION_TOKEN=
NOTION_COURSES_DB_ID=
NOTION_TOPICS_DB_ID=
NOTION_LESSONS_DB_ID=
NOTION_PROJECTS_DB_ID=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3001
REVALIDATE_TIME=60
```

**Vercel** (production):
- همه موارد بالا + `NEXT_PUBLIC_SITE_URL=https://academy.analyfy.me`
