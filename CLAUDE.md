@AGENTS.md

# آکادمی آنالیفای — راهنمای Claude

## ⚠️ قوانین ثابت (هرگز نقض نشوند)

1. **اطلاعات حساس**: هرگز از کاربر نخواه API key یا credential را در چت paste کند. همه credentials فقط در `.env.local` (gitignored) قرار می‌گیرند. هرگز `.env.local` را commit یا share نکن.
2. **زبان کد**: تمام کد به انگلیسی. متن‌های UI به فارسی (RTL).
3. **این Next.js 16.2.6 + React 19 است** — رفتار ممکن است با نسخه‌های قدیمی‌تر فرق داشته باشد. قبل از نوشتن کد، `node_modules/next/dist/docs/` را چک کن.
4. **Dev server روی port 3001**: `npm run dev` — port در `package.json` با `-p 3001` ثابت شده. هرگز بدون flag اجرا نکن چون port 3000 اشغال برنامه دیگری است.
5. **بعد از هر تغییر فاینال**: CLAUDE.md آپدیت + git commit + push.
6. **هر تغییر schema دیتابیس**: یک فایل migration در `supabase/migrations/` بساز و commit کن. Repository تنها منبع حقیقت schema است.
7. **قبل از هر کار**: فایل `PROJECT_MEMORY.md` را بخوان — قوانین معماری بحرانی آنجاست.

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
- [x] `searchLessons` با URL کامل در نتایج + SearchModal
- [x] History page با `course_slug`/`lesson_slug`
- [x] Sidebar با URL سلسله‌مراتبی از DB
- [x] لوگوی واحد (`/logo.webp`) در همه جا — `Logo.tsx` ساده‌سازی شد
- [x] `proxy.ts` (جایگزین `middleware.ts`)
- [x] Node.js heap 4GB در dev (`NODE_OPTIONS=--max-old-space-size=4096`)
- [x] پروفایل عمومی `/user/[username]`
- [x] پنل ادمین + org-admin
- [x] Bounty badge و prize
- [x] JSON-LD structured data
- [x] صفحات: history، projects، certificate، sponsors
- [x] Route group `(marketing)` — لندینگ پیج بدون sidebar
- [x] لندینگ پیج MVP با glassmorphism + Viral Content Framework
- [x] Light mode اجباری — `@variant dark` در globals.css غیرفعال
- [x] Smart auto-scroll با ResizeObserver
- [x] **سیستم کامنت‌ها (Q&A)**:
  - POST/GET `/api/comments` + optimistic UI + rollback
  - own comments در private chat stream
  - community Q&As در side drawer جداگانه (با avatar و نام واقعی)
  - Admin replies با logo + "پشتیبانی آنالیفای" badge
  - threading: replies نشان داده می‌شوند زیر سوال مربوطه
  - GuestTeaser — ۳ جدیدترین approved+public Q&A
- [x] **Admin Comments Dashboard** `/admin/comments`:
  - فیلتر status/course/lesson/privacy/thread + text search
  - Bulk Approve، Quick Reply inline
  - Threading sort: replies بلافاصله زیر parent
  - Delete button برای replies
  - Service role client (vanilla supabase-js) — RLS bypass
- [x] **Admin Invites Dashboard** `/admin/invites`:
  - لیست همه کاربران با invite_code، quota، تعداد دعوت‌شده
  - Progress bar رنگی (آبی → نارنجی → قرمز)
  - آمار: کل کاربران، دعوت‌شده‌ها، لیست انتظار
- [x] **Invite-Only Signup**:
  - صفحه login: تب ورود + تب عضویت جداگانه
  - بدون کد → ثبت در `waitlist` + پیام انتظار
  - با کد معتبر → بررسی quota → ارسال magic link
  - auto-upgrade quota از `system_settings.upgrade_levels` در ۷ روز اول
  - `invited_by` از طریق `?invited_by=` در redirect URL به callback ارسال می‌شه
- [x] **Settings → شبکه دعوت من** (`InviteNetwork.tsx`):
  - نمایش invite_code با copy button
  - Progress bar (استفاده‌شده / سقف)
  - لیست دعوت‌شده‌ها با ایمیل mask‌شده + تاریخ عضویت
  - نشان "دعوت شده توسط: [نام]" اگر کاربر با کد عضو شده
- [x] ChatBubble: name header فقط برای پیام‌های دیگران (نه پیام‌های خود کاربر)
- [x] Admin reply links: `<LinkifiedText>` (URLs کلیک‌پذیر)
- [x] واژه‌شناسی: "دانشجو" (نه "دانش‌آموز") در همه جای UI

### ⚠️ باید کاربر انجام دهد (Supabase Dashboard → SQL Editor)

| Migration | وضعیت | توضیح |
|---|---|---|
| `005_comments_rls.sql` | ⚠️ اجرا شود | RLS policies برای comments |
| `006_add_email_to_profiles.sql` | ⚠️ اجرا شود | email column در profiles |
| `007_upgrade_comments.sql` | ⚠️ اجرا شود | course_id, lesson_id, parent_id در comments |
| `008_gamification_and_invites.sql` | ⚠️ اجرا شود | waitlist, system_settings, badges, user_badges + invite columns در profiles |
| `009_fix_invite_trigger.sql` | ⚠️ اجرا شود | trigger اصلاح‌شده با regexp_replace + WHILE EXISTS |
| `010_backfill_invite_codes.sql` | ⚠️ اجرا شود | backfill همه invite_code های ناقص/null |

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
│   ├── auth/callback/route.ts             # OTP exchange + writes invited_by to profile
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
│   │   ├── settings/
│   │   │   ├── page.tsx                   # fetches profile + invitees + inviter name
│   │   │   ├── SettingsForm.tsx           # profile edit form
│   │   │   └── InviteNetwork.tsx          # invite code UI + gamification
│   │   ├── user/[username]/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx                   # AdminPanel wrapper (auth guard)
│   │   │   ├── comments/
│   │   │   │   ├── page.tsx               # Server Component — service role fetch
│   │   │   │   ├── CommentsTable.tsx      # Client — filters, threading, reply, delete
│   │   │   │   └── actions.ts             # Server Actions (vanilla supabase-js)
│   │   │   └── invites/
│   │   │       └── page.tsx               # invite tracker — service role, all users
│   │   └── org-admin/page.tsx
│   ├── api/
│   │   ├── progress/route.ts
│   │   ├── comments/route.ts              # GET: force-dynamic, service-role profiles
│   │   ├── projects/route.ts
│   │   ├── ratings/route.ts
│   │   ├── search/route.ts
│   │   ├── certificates/route.ts
│   │   └── admin/
│   └── login/page.tsx                     # Login + Signup tabs (invite-gated)
├── components/
│   ├── chat/
│   │   ├── LessonChatShell.tsx            # درس + Q&A + community drawer
│   │   ├── ChatArea.tsx                   # ResizeObserver smart scroll (smooth)
│   │   ├── ChatBubble.tsx                 # SystemBubble + UserBubble + LinkifiedText
│   │   ├── LessonContent.tsx
│   │   ├── QuizWidget.tsx
│   │   ├── FileUploadWidget.tsx
│   │   └── GuestTeaser.tsx
│   ├── admin/
│   │   ├── AdminPanel.tsx
│   │   ├── CommentsTab.tsx
│   │   └── ProjectsTab.tsx
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
│   ├── supabase/server.ts                 # createClient (SSR) + createServiceClient (SSR)
│   └── utils.ts
└── types/index.ts                         # Profile includes invite fields
```

---

## Supabase Schema — وضعیت کامل

### جدول `profiles`
```
user_id          uuid PK → auth.users
display_name     text
avatar_url       text
role             text (student/admin/org-admin)
org_id           uuid
username         text UNIQUE
bio              text
linkedin_url     text
website_url      text
expertise        text
email            text
created_at       timestamptz
invite_code      text UNIQUE          ← 7 chars: 4 letters + 3 digits (e.g. ANAJ832)
invite_quota     integer DEFAULT 10
invited_by       uuid → profiles(user_id)
invite_created_at timestamptz
```

### جدول `waitlist`
```
id         uuid PK
email      text UNIQUE
created_at timestamptz
```
RLS: insert-only, no auth required.

### جدول `system_settings`
```
id    uuid PK
key   text UNIQUE
value JSONB
```
Default row: `key='invite_rules'`, `value={"base_quota":10,"upgrade_levels":[10,20,30,50,70,100,150,200,250,300,400,500,1000,5000]}`

### جدول `badges`
```
id          uuid PK
name        text UNIQUE
level       int
color_theme text
icon        text
```
RLS: public read.

### جدول `user_badges`
```
id         uuid PK
user_id    uuid → profiles(user_id)
badge_id   uuid → badges(id)
is_visible boolean DEFAULT true      ← privacy toggle
awarded_at timestamptz
```
RLS: owner sees all own; public sees only is_visible=true.

### جدول `comments`
```
id                uuid PK
user_id           uuid → auth.users
topic_id          text
course_id         text (courseSlug)
lesson_id         text (lessonSlug)
parent_id         uuid → comments
content           text
is_public_consent boolean DEFAULT false
status            text (pending/approved/rejected)
created_at        timestamptz
```

### Migration files در repo
| فایل | محتوا |
|---|---|
| `001_initial.sql` | schema اولیه + trigger اولیه |
| `002_b2b_and_bounties.sql` | B2B + bounty |
| `003_academy_schema.sql` | schema آکادمی |
| `004_progress_slugs.sql` | course_slug + lesson_slug |
| `005_comments_rls.sql` | RLS policies برای comments |
| `006_add_email_to_profiles.sql` | email در profiles |
| `007_upgrade_comments.sql` | course_id, lesson_id, parent_id در comments |
| `008_gamification_and_invites.sql` | waitlist, system_settings, badges, user_badges, invite columns |
| `009_fix_invite_trigger.sql` | trigger با regexp_replace + WHILE EXISTS |
| `010_backfill_invite_codes.sql` | backfill کدهای ناقص/null |

---

## Comment System — معماری کامل

### جریان داده
1. **POST** `/api/comments`: insert با `user_id`, `topic_id`, `course_id`, `lesson_id`, `status:'pending'`
2. **GET** `/api/comments?topic_id=X`:
   - comments با SSR client (RLS: own + approved+public)
   - profiles با **service-role client** (bypass RLS — ببین PROJECT_MEMORY Rule 3)
   - برمی‌گردونه: `is_own`, `display_name`, `avatar_url`, `parent_id`
3. **LessonChatShell** `loadComments()`:
   - `ownTopLevel` → chat stream (parent_id=null + is_own)
   - `repliesToOwn` → chat stream (parent_id ∈ ownIds + approved)
   - `communityTopLevel` → community drawer
   - `communityReplies` → زیر سوال مربوطه در drawer

### Admin Actions (Server Actions در `actions.ts`)
همه با vanilla `@supabase/supabase-js` + service role key:
- `approveComment(id)` — update status='approved'
- `rejectComment(id)` — update status='rejected'
- `bulkApproveComments(ids[])` — batch approve
- `replyAndApprove(parentId, text, context)` — insert reply + auto-approve parent
- `deleteComment(id)` — delete (فقط برای replies)

---

## Invite System — معماری کامل

### جریان signup
```
کاربر → /login (Signup tab)
  ├── بدون کد → INSERT into waitlist → نمایش "⏳ در لیست انتظار"
  └── با کد → بررسی profiles.invite_code
        ├── نامعتبر → خطا "کد دعوت معتبر نیست"
        ├── معتبر + count < quota → ارسال magic link
        ├── معتبر + count >= quota + ≤7 روز → upgrade quota از system_settings + ارسال magic link
        └── معتبر + count >= quota + >7 روز → خطا "ظرفیت پر شده"

magic link → /auth/callback?invited_by=<uuid>
  └── UPDATE profiles SET invited_by = <uuid> WHERE user_id = new_user AND invited_by IS NULL
```

### invite_code generation (در trigger)
```sql
_local   := split_part(NEW.email, '@', 1);
_letters := upper(left(regexp_replace(_local, '[^a-zA-Z0-9]', '', 'g'), 4));
_code    := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
WHILE EXISTS (SELECT 1 FROM profiles WHERE invite_code = _code) LOOP
  _code := _letters || lpad(floor(random() * 1000)::int::text, 3, '0');
END LOOP;
```

---

## الگوهای ❌/✅

```typescript
// ❌ middleware.ts                    →  ✅ proxy.ts
// ❌ export const revalidate در lib   →  ✅ unstable_cache
// ❌ UUID reconstruction              →  ✅ courses.find(c => c.slug === slug)
// ❌ /learn/[lessonId]               →  ✅ /course/[courseSlug]/lesson/[lessonSlug]
// ❌ dark: Tailwind                   →  ✅ explicit light colors
// ❌ scrollIntoView smooth            →  ✅ ResizeObserver + smooth scroll (non-streaming)
// ❌ profiles(...) join on comments   →  ✅ دو query جداگانه + merge در JS
// ❌ createServiceClient (SSR)        →  ✅ createSupabaseClient (vanilla) در admin/actions
// ❌ REFERENCES profiles(id)          →  ✅ REFERENCES profiles(user_id)
// ❌ auth.uid() subquery در RLS       →  ✅ user_id = auth.uid() مستقیم
// ❌ دانش‌آموز                        →  ✅ دانشجو
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
