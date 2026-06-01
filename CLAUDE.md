@AGENTS.md

# آکادمی آنالیفای — راهنمای Claude

## ⚠️ قوانین ثابت (هرگز نقض نشوند)

1. **اطلاعات حساس**: هرگز از کاربر نخواه API key یا credential را در چت paste کند. همه credentials فقط در `.env.local` (gitignored) قرار می‌گیرند. هرگز `.env.local` را commit یا share نکن.
2. **زبان کد**: تمام کد به انگلیسی. متن‌های UI به فارسی (RTL).
3. **این Next.js 16.2.6 + React 19 است** — رفتار ممکن است با نسخه‌های قدیمی‌تر فرق داشته باشد. قبل از نوشتن کد، `node_modules/next/dist/docs/` را چک کن.
4. **Dev server روی port 3001** اجرا می‌شود: `npm run dev` (port در package.json ثابت شده — هرگز بدون `-p 3001` اجرا نکن)

---

## معماری پروژه

### Stack
- **Next.js 16.2.6** — App Router, Server Components, dynamic segments
- **React 19.2.4**
- **Supabase** — Auth (magic link) + PostgreSQL database
- **Notion** — CMS اصلی (دوره‌ها، مباحث، درس‌ها، پروژه‌ها)
- **Tailwind CSS** — استایل‌دهی
- **Framer Motion** — انیمیشن‌های چت
- **Vazirmatn** — فونت فارسی

### نکته مهم: proxy.ts (نه middleware.ts)
در Next.js 16، فایل `middleware.ts` کاملاً deprecated شده و باعث **internal server error** می‌شود.
باید از `src/proxy.ts` با export به نام `proxy` استفاده کرد:
```typescript
// ✅ درست — src/proxy.ts
export async function proxy(request: NextRequest) { ... }

// ❌ اشتباه — src/middleware.ts
export async function middleware(request: NextRequest) { ... }
```

### ساختار مسیرها
```
src/
├── app/
│   ├── (main)/                        # Layout اصلی با Sidebar
│   │   ├── layout.tsx                 # Sidebar + main content wrapper
│   │   ├── explore/page.tsx           # لیست دوره‌ها + آمار Supabase
│   │   ├── course/[courseSlug]/
│   │   │   ├── page.tsx               # Server Component: slug-based lookup
│   │   │   ├── CourseDetailClient.tsx # Client: topic/lesson tree
│   │   │   └── lesson/[lessonSlug]/
│   │   │       └── page.tsx           # Server Component: getLessonBySlug
│   │   ├── history/page.tsx           # تاریخچه یادگیری
│   │   ├── projects/page.tsx          # پروژه‌های ارسال‌شده
│   │   ├── certificate/page.tsx       # گواهینامه
│   │   ├── sponsors/page.tsx          # حامیان
│   │   ├── settings/page.tsx          # تنظیمات کاربر
│   │   ├── user/[username]/page.tsx   # پروفایل عمومی
│   │   ├── admin/page.tsx             # پنل ادمین
│   │   └── org-admin/page.tsx         # پنل سازمان‌ها
│   ├── api/
│   │   ├── progress/route.ts          # GET/POST پیشرفت درس
│   │   ├── comments/route.ts          # GET/POST کامنت‌ها
│   │   ├── projects/route.ts          # POST آپلود پروژه
│   │   ├── ratings/route.ts           # POST امتیاز دوره
│   │   ├── search/route.ts            # GET جستجوی درس
│   │   ├── certificates/route.ts      # GET گواهینامه
│   │   └── admin/                     # Admin-only routes
│   └── login/page.tsx                 # Magic link auth
├── components/
│   ├── chat/
│   │   ├── LessonChatShell.tsx        # کانتینر اصلی درس (Client)
│   │   ├── ChatArea.tsx               # لیست پیام‌ها
│   │   ├── ChatBubble.tsx             # هر پیام (text/quiz/next-button/file-upload)
│   │   ├── LessonContent.tsx          # رندر HTML محتوای درس
│   │   ├── QuizWidget.tsx             # کوییز چندگزینه‌ای
│   │   ├── FileUploadWidget.tsx       # آپلود پروژه
│   │   └── GuestTeaser.tsx            # CTA ورود برای مهمانان
│   ├── sidebar/
│   │   └── Sidebar.tsx                # Navigation + Recent threads + CMD+K
│   └── ui/
│       ├── SearchModal.tsx            # جستجوی CMD+K
│       ├── StarRating.tsx             # امتیازدهی (فقط در explore)
│       ├── BountyBadge.tsx            # نشان جایزه
│       └── JsonLd.tsx                 # Schema.org structured data
├── lib/
│   ├── notion/
│   │   ├── client.ts                  # تمام Notion API calls + caching
│   │   └── blocks.ts                  # تبدیل Notion blocks به HTML
│   ├── supabase/
│   │   ├── client.ts                  # Client-side Supabase
│   │   └── server.ts                  # Server-side Supabase
│   ├── utils.ts                       # makeRouteSlug, slugify, formatDate
│   └── nanoid.ts                      # ID generator
├── types/index.ts                     # همه TypeScript types
└── middleware.ts                      # Auth redirect middleware
```

---

## سیستم URL و Slug

### فرمت Slug
```
/course/{title-slug}-{5char}/lesson/{title-slug}-{5char}
```
مثال: `/course/python-basics-370a8/lesson/variables-a1b2c`

### تابع کلیدی در `src/lib/utils.ts`
```typescript
export function makeRouteSlug(title: string, notionId: string): string {
  const hash5 = notionId.replace(/-/g, '').slice(0, 5);
  return `${slugify(title)}-${hash5}`;
}
```

### Slug Resolution (بدون UUID بازسازی)
چون فقط ۵ کاراکتر داریم، UUID کامل قابل بازسازی نیست. بنابراین:
```typescript
// در getCourses: courses.find(c => c.slug === courseSlug)
// در getLessonBySlug: همه topicها را به‌صورت parallel اسکن می‌کنیم
```

---

## Notion Client — الگوهای مهم (`src/lib/notion/client.ts`)

### چرا `unstable_cache`؟
- Notion SDK از HTTP client خودش استفاده می‌کند (نه fetch پچ‌شده Next.js)
- `export const revalidate` در library files کار نمی‌کند (فقط در route/page files)
- **راه‌حل**: همه Notion calls داخل `unstable_cache` هستند

```typescript
const REVALIDATE_TIME = parseInt(process.env.REVALIDATE_TIME || '60', 10);

const _getCourses = unstable_cache(
  async (includeAll: boolean): Promise<Course[]> => { /* ... */ },
  ['notion-courses'],
  { revalidate: REVALIDATE_TIME }
);
export async function getCourses(includeAll = false) { return _getCourses(includeAll); }
```

### توابع اصلی Export شده
| تابع | کاربرد |
|---|---|
| `getCourses(includeAll?)` | لیست دوره‌ها (filter: Status=Published) |
| `getTopicsByCourse(courseId)` | مباحث یک دوره (sort by Order) |
| `getLessonsByTopic(topicId)` | درس‌های یک مبحث |
| `getLessonById(lessonId)` | یک درس با HTML content |
| `getLessonBySlug(courseSlug, lessonSlug)` | lookup slug-based (بدون UUID) |
| `getNextLessonUrl(courseSlug, lesson)` | URL درس بعدی (null اگر آخرین درس) |
| `searchLessons(query)` | جستجو و برگرداندن `SearchResult[]` با `url` |

### مشکل رایج: دوره در سایت نمایش داده نمی‌شود
**دلیل اصلی**: فیلتر `Status = "Published"` در `getCourses()`
→ در Notion، فیلد **Status** دوره را روی **Published** تنظیم کن.

---

## Supabase — Database Schema

### جداول اصلی
- `profiles` — اطلاعات کاربر، role، org_id، username
- `user_progress` — پیشرفت درس‌ها (lesson_id، topic_id، course_slug، lesson_slug)
- `comments` — بازتاب‌های یادگیری (status: pending/approved/rejected)
- `projects` — پروژه‌های آپلودشده
- `course_ratings` — امتیاز دوره‌ها
- `organizations` — سازمان‌ها برای B2B

### Migrations
```
supabase/migrations/
├── 001_initial.sql          # جداول پایه
├── 002_b2b_and_bounties.sql # سازمان‌ها و باونتی
├── 003_academy_schema.sql   # username، bio، last_reviewed، lesson_title
└── 004_progress_slugs.sql   # course_slug و lesson_slug در user_progress
```

### Migration 004 — مهم!
```sql
ALTER TABLE user_progress
  ADD COLUMN IF NOT EXISTS course_slug TEXT,
  ADD COLUMN IF NOT EXISTS lesson_slug TEXT;
```
این ستون‌ها باید در Supabase Dashboard اجرا شوند تا Sidebar و History به‌درستی کار کنند.

---

## معماری Chat (درس‌ها)

### جریان اصلی
1. `LessonPage` (Server Component) — `getLessonBySlug` → pass to `LessonChatShell`
2. `LessonChatShell` (Client) — انیمیشن متن، کوییز، next-button، input کامنت
3. `ChatArea` → `ChatBubble` — رندر هر message بر اساس `type`

### انواع پیام (ChatMessage.type)
- `text` — محتوای درس یا پاسخ کوییز
- `quiz` — کوییز چندگزینه‌ای (از `Quiz_Content` نوشن)
- `next-button` — دکمه "درس بعدی" یا "پایان دوره"
- `file-upload` — آپلود پروژه

### Bot Detection (SEO)
```typescript
function isBot(ua: string): boolean {
  return /googlebot|bingbot|.../i.test(ua);
}
// isBot=true → انیمیشن متن bypass می‌شود (محتوا یکجا رندر می‌شود)
```

### کامنت‌ها (بازتاب یادگیری)
- Input دائمی در پایین صفحه (ChatGPT-style) — فقط برای کاربران login شده
- Optimistic UI: bubble کاربر فوری اضافه می‌شود
- Privacy opt-out: checkbox "نمی‌خواهم عمومی شود" (پیش‌فرض: عمومی)
- مهمانان: بعد از اتمام درس `GuestTeaser` (۳ کامنت عمومی + CTA)

---

## API Routes

### `POST /api/progress`
```json
{ "lesson_id", "topic_id", "lesson_title", "course_slug", "lesson_slug" }
```
Upsert در `user_progress` با conflict روی `user_id, lesson_id`.

### `GET /api/progress`
پارامترهای optional: `topic_id`, `limit`
برمی‌گرداند: `{ progress: [...] }` با `course_slug` و `lesson_slug`.

### `GET /api/search?q=...`
برمی‌گرداند: `{ results: SearchResult[] }` که `SearchResult` شامل `url` است.

### `GET /api/comments?topic_id=...`
کامنت‌های approved+public_consent — **بدون نیاز به auth** (برای GuestTeaser).

---

## Sidebar — Recent Threads

```typescript
// query فقط ردیف‌هایی که course_slug و lesson_slug دارند
supabase.from('user_progress')
  .not('course_slug', 'is', null)
  .not('lesson_slug', 'is', null)
  ...

// لینک مستقیم بدون redirect
const href = `/course/${thread.course_slug}/lesson/${thread.lesson_slug}`;
```

---

## وضعیت فعلی پروژه (آخرین آپدیت)

### ✅ تکمیل‌شده
- [x] احراز هویت (magic link)
- [x] دوره‌ها از Notion با ISR
- [x] سیستم درس ChatGPT-style با انیمیشن
- [x] کوییز چندگزینه‌ای (از فیلد Quiz_Content جدا)
- [x] "درس بعدی" با URL سلسله‌مراتبی واقعی
- [x] مباحث و درس‌ها با slug ۵ کاراکتری
- [x] unstable_cache برای همه Notion calls
- [x] getLessonBySlug و getNextLessonUrl
- [x] searchLessons با URL کامل
- [x] SearchModal با navigateTo(result.url)
- [x] history/page با course_slug/lesson_slug
- [x] Migration 004 (فایل ساخته شده)
- [x] حذف `/learn/[lessonId]` route (پاک شد)
- [x] Sidebar با URL سلسله‌مراتبی
- [x] پروفایل عمومی `/user/[username]`
- [x] پنل ادمین + org-admin
- [x] Bounty badge و prize
- [x] JSON-LD structured data
- [x] StarRating فقط در explore (حذف از lesson)
- [x] GuestTeaser با ۳ کامنت عمومی
- [x] صفحات: history، projects، certificate، sponsors

### ⏳ در حال انجام
- [ ] **TypeScript check**: `npx tsc --noEmit` — باید پاس شود (۲ خطا رفع شد، نیاز به تأیید)
- [ ] **Build check**: `npx next build`
- [ ] **Git commit** + push به `najmeddini/analyfy-learning-platform`
- [ ] **Migration 004** را در Supabase Dashboard اجرا کن

### 📋 باقی‌مانده
- [ ] Projects page: اتصال به Notion Projects DB بررسی شود
- [ ] GitHub push: `gh auth login` با اکانت `najmeddini` (یا PAT)

---

## خطاهای TypeScript که رفع شدند

1. **`.next` cache stale**: پاک کردن `.next/` بعد از حذف `/learn` route
2. **`topic` prop missing در lesson page**: اضافه شد fetch و pass topic
3. **`type Course` تکراری در notion/client.ts**: حذف شد re-declaration

---

## الگوهای مهم که باید رعایت شوند

### ❌ هرگز این کارها را نکن
```typescript
// ❌ فایل middleware.ts — در Next.js 16 deprecated است و internal server error می‌دهد
// به جایش proxy.ts با export به نام `proxy` استفاده کن (نه `middleware`)

// ❌ در library files:
export const revalidate = 60; // در client.ts کار نمی‌کند

// ❌ UUID reconstruction از slug
const uuid = slug.slice(-5); // با ۵ کاراکتر UUID کامل قابل بازسازی نیست

// ❌ redirect از /learn به /course
// (این route حذف شده — مستقیم /course/.../lesson/... استفاده کن)

// ❌ StarRating در lesson page
// (فقط در explore/course overview است)
```

### ✅ همیشه این کارها را بکن
```typescript
// ✅ caching برای Notion
const _fn = unstable_cache(async () => { /* ... */ }, ['key'], { revalidate: 60 });

// ✅ URL سلسله‌مراتبی
href = `/course/${course.slug}/lesson/${lesson.slug}`;

// ✅ Slug lookup بدون UUID
const course = courses.find(c => c.slug === courseSlug);

// ✅ Promise.all برای parallel fetching
const [nextUrl, supabase] = await Promise.all([getNextLessonUrl(...), createClient()]);
```

---

## متغیرهای محیطی (`.env.local`)

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
