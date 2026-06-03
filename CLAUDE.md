@AGENTS.md

# آکادمی آنالیفای — راهنمای Claude

## ⚠️ قوانین ثابت (هرگز نقض نشوند)

1. **اطلاعات حساس**: هرگز از کاربر نخواه API key یا credential را در چت paste کند. همه credentials فقط در `.env.local` (gitignored) قرار می‌گیرند. هرگز `.env.local` را commit یا share نکن.
2. **زبان کد**: تمام کد به انگلیسی. متن‌های UI به فارسی (RTL).
3. **این Next.js 16.2.6 + React 19 است** — رفتار ممکن است با نسخه‌های قدیمی‌تر فرق داشته باشد. قبل از نوشتن کد، `node_modules/next/dist/docs/` را چک کن.
4. **Dev server روی port 3001**: `npm run dev` — port در `package.json` با `-p 3001` ثابت شده. هرگز بدون flag اجرا نکن چون port 3000 اشغال برنامه دیگری است.
5. **بعد از هر تغییر فاینال**: CLAUDE.md آپدیت + git commit + push.

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
- [x] سیستم درس ChatGPT-style با انیمیشن
- [x] کوییز چندگزینه‌ای (فیلد `Quiz_Content` جدا)
- [x] "درس بعدی" با URL سلسله‌مراتبی واقعی (`getNextLessonUrl`)
- [x] Slug ۵ کاراکتری: `/course/{slug}-{5char}/lesson/{slug}-{5char}`
- [x] `getLessonBySlug` و `getNextLessonUrl` (بدون UUID reconstruction)
- [x] `searchLessons` با URL کامل در نتایج
- [x] SearchModal با `result.url` (نه `/learn/[id]`)
- [x] History page با `course_slug`/`lesson_slug`
- [x] Migration 004 فایل ساخته شده (باید در Supabase Dashboard اجرا شود)
- [x] حذف `/learn/[lessonId]` route
- [x] Sidebar با URL سلسله‌مراتبی از DB
- [x] لوگوی واقعی Analyfy (light/dark theme switching)
- [x] `Logo` component در `src/components/ui/Logo.tsx`
- [x] Login page، Landing page، Sidebar همه لوگو دارند
- [x] `proxy.ts` (جایگزین `middleware.ts`)
- [x] Node.js heap 4GB در dev (`NODE_OPTIONS=--max-old-space-size=4096`)
- [x] پروفایل عمومی `/user/[username]`
- [x] پنل ادمین + org-admin
- [x] Bounty badge و prize
- [x] JSON-LD structured data
- [x] GuestTeaser با ۳ کامنت عمومی
- [x] صفحات: history، projects، certificate، sponsors

### ⚠️ باید کاربر انجام دهد
- [ ] **Migration 004** را در Supabase Dashboard اجرا کن:
  ```sql
  ALTER TABLE user_progress
    ADD COLUMN IF NOT EXISTS course_slug TEXT,
    ADD COLUMN IF NOT EXISTS lesson_slug TEXT;
  ```

### 📋 قدم بعدی (مهم‌ترین)
- [ ] **Landing page جدید** (`src/app/(main)/page.tsx`) — صفحه اصلی باید کاملاً بازطراحی شود:
  - MVP launch با invite-code system
  - Glassmorphism design
  - RTL فارسی با Vazirmatn
  - هدف: جذب early adopters، نمایش "دعوت‌نامه محدود"
  - CTA اصلی: "ورود با کد دعوت" ← redirect به `/login`
  - بر اساس Viral Content Framework (فایل: `/Users/fahime/Documents/Amin/Claude Cowork/Analyfy Styles/viral-content-framework2.md`)
  - کاربر request کامل را در session قبلی داده — بخوان و پیاده کن

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
│   ├── (main)/
│   │   ├── page.tsx                       # ← Landing page (باید بازنویسی شود)
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
│   │   ├── comments/route.ts
│   │   ├── projects/route.ts
│   │   ├── ratings/route.ts
│   │   ├── search/route.ts
│   │   ├── certificates/route.ts
│   │   └── admin/
│   └── login/page.tsx
├── components/
│   ├── chat/
│   │   ├── LessonChatShell.tsx            # کانتینر درس (Client)
│   │   ├── ChatArea.tsx
│   │   ├── ChatBubble.tsx
│   │   ├── LessonContent.tsx
│   │   ├── QuizWidget.tsx
│   │   ├── FileUploadWidget.tsx
│   │   └── GuestTeaser.tsx
│   ├── sidebar/Sidebar.tsx
│   └── ui/
│       ├── Logo.tsx                       # ← لوگو با dark/light switching
│       ├── SearchModal.tsx
│       ├── StarRating.tsx                 # فقط در explore
│       ├── BountyBadge.tsx
│       └── JsonLd.tsx
├── lib/
│   ├── notion/client.ts                   # همه Notion API + unstable_cache
│   ├── notion/blocks.ts
│   ├── supabase/client.ts
│   ├── supabase/server.ts
│   └── utils.ts
└── types/index.ts
```

---

## Logo Component

```tsx
// src/components/ui/Logo.tsx
// استفاده از <picture> برای dark/light theme switching خودکار
<picture>
  <source media="(prefers-color-scheme: dark)" srcSet="/logo-dark.webp" />
  <img src="/logo-light.webp" alt="آکادمی آنالیفای" width={size} height={size} />
</picture>
```

فایل‌های لوگو در `public/`:
- `logo-light.webp` — برای تم روشن (لوگوی تاریک)
- `logo-dark.webp` — برای تم تاریک (لوگوی سفید)

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

### توابع اصلی
| تابع | کاربرد |
|---|---|
| `getCourses(includeAll?)` | filter: Status=Published |
| `getTopicsByCourse(courseId)` | sort by Order |
| `getLessonsByTopic(topicId)` | درس‌های یک مبحث |
| `getLessonById(lessonId)` | با HTML content |
| `getLessonBySlug(courseSlug, lessonSlug)` | slug-based lookup |
| `getNextLessonUrl(courseSlug, lesson)` | null = آخرین درس |
| `searchLessons(query)` | با `url` در نتیجه |

---

## Supabase Schema

```
profiles          — user info, role, org_id, username
user_progress     — lesson progress + course_slug + lesson_slug (migration 004)
comments          — بازتاب یادگیری (pending/approved/rejected)
projects          — پروژه‌های آپلودشده
course_ratings    — امتیاز دوره‌ها
organizations     — B2B
```

**Migration 004** (باید اجرا شود):
```sql
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS course_slug TEXT,
  ADD COLUMN IF NOT EXISTS lesson_slug TEXT;
```

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
