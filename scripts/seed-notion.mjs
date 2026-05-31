import { Client } from '@notionhq/client';
import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });

const notion = new Client({ auth: process.env.NOTION_TOKEN });

const COURSES = process.env.NOTION_COURSES_DB_ID;
const TOPICS  = process.env.NOTION_TOPICS_DB_ID;
const LESSONS = process.env.NOTION_LESSONS_DB_ID;

const lessonContents = {
  l1: `## Python چیست؟

Python یک زبان برنامه‌نویسی **سطح بالا**، ساده و قدرتمند است که در سال ۱۹۹۱ توسط Guido van Rossum ساخته شد.

## چرا Python؟

- **ساده و خوانا:** دستورات به زبان طبیعی نزدیکند
- **همه‌کاره:** وب، هوش مصنوعی، علم داده، اتوماسیون
- **جامعه بزرگ:** میلیون‌ها توسعه‌دهنده در سراسر جهان

## اولین برنامه

\`\`\`python
print("سلام، دنیا!")
\`\`\`

این یک خط کافیه تا اولین برنامه Python رو اجرا کنی!`,

  l2: `## نصب Python

برای نصب Python به سایت [python.org](https://python.org) برو و آخرین نسخه را دانلود کن.

## ویرایشگر کد

برای نوشتن کد Python نیاز به یک ویرایشگر داری:

- **VS Code** — رایگان و محبوب‌ترین
- **PyCharm** — قوی‌ترین IDE برای Python
- **Jupyter Notebook** — مناسب علم داده

## تأیید نصب

بعد از نصب، این دستور را در Terminal اجرا کن:

\`\`\`python
python --version
\`\`\`

کدام ویرایشگر برای تازه‌کارها مناسب‌تر است؟

- [x] VS Code
- [ ] Vim
- [ ] Notepad
- [ ] Excel`,

  l3: `## متغیر چیست؟

متغیر یک **ظرف** برای نگهداری داده است. در Python نیازی به تعریف نوع متغیر نیست:

\`\`\`python
name = "امین"
age = 25
height = 1.75
is_student = True
\`\`\`

## انواع داده اصلی

| نوع | مثال | توضیح |
|-----|------|-------|
| str | "سلام" | رشته متنی |
| int | 42 | عدد صحیح |
| float | 3.14 | عدد اعشاری |
| bool | True | منطقی |

## تابع type()

برای فهمیدن نوع یک متغیر:

\`\`\`python
print(type(name))    # <class 'str'>
print(type(age))     # <class 'int'>
\`\`\``,

  l4: `## عملگرهای ریاضی

\`\`\`python
a = 10
b = 3

print(a + b)   # جمع: 13
print(a - b)   # تفریق: 7
print(a * b)   # ضرب: 30
print(a / b)   # تقسیم: 3.33
print(a // b)  # تقسیم صحیح: 3
print(a % b)   # باقیمانده: 1
print(a ** b)  # توان: 1000
\`\`\`

## عملگرهای مقایسه

\`\`\`python
print(5 > 3)    # True
print(5 == 5)   # True
print(5 != 3)   # True
\`\`\`

حاصل ۱۰ به توان ۳ در Python چیست؟

- [x] 1000
- [ ] 30
- [ ] 100
- [ ] 13`,
};

async function seed() {
  console.log('🚀 شروع ساخت داده‌های نمونه...\n');

  // ── ۱. ایجاد دوره ──
  const course = await notion.pages.create({
    parent: { data_source_id: COURSES },
    properties: {
      'Name':        { title: [{ text: { content: 'مقدمه‌ای بر برنامه‌نویسی Python' } }] },
      'Status':      { select: { name: 'Published' } },
      'Cover_Image': { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/800px-Python-logo-notext.svg.png' },
    },
  });
  console.log('✅ دوره ساخته شد:', course.id);

  // ── ۲. موضوع ۱ ──
  const topic1 = await notion.pages.create({
    parent: { data_source_id: TOPICS },
    properties: {
      'Name':                { title: [{ text: { content: 'آشنایی با Python' } }] },
      'Order':               { number: 1 },
      'Has_Project':         { checkbox: false },
      'Project_Max_Size_MB': { number: 5 },
      'Allowed_Extensions':  { rich_text: [{ text: { content: '.py,.zip' } }] },
      '🎓 Courses':          { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ موضوع ۱ ساخته شد:', topic1.id);

  // ── ۳. موضوع ۲ ──
  const topic2 = await notion.pages.create({
    parent: { data_source_id: TOPICS },
    properties: {
      'Name':                { title: [{ text: { content: 'متغیرها و انواع داده' } }] },
      'Order':               { number: 2 },
      'Has_Project':         { checkbox: true },
      'Project_Max_Size_MB': { number: 5 },
      'Allowed_Extensions':  { rich_text: [{ text: { content: '.py,.zip' } }] },
      '🎓 Courses':          { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ موضوع ۲ ساخته شد:', topic2.id);

  // ── ۴. درس‌های موضوع ۱ ──
  await notion.pages.create({
    parent: { data_source_id: LESSONS },
    properties: {
      'Name':       { title: [{ text: { content: 'Python چیست؟' } }] },
      'Order':      { number: 1 },
      'Has_Quiz':   { checkbox: false },
      'Content':    { rich_text: [{ text: { content: lessonContents.l1 } }] },
      '🎓 Topics':  { relation: [{ id: topic1.id }] },
      '🎓 Courses': { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ درس ۱ ساخته شد');

  await notion.pages.create({
    parent: { data_source_id: LESSONS },
    properties: {
      'Name':       { title: [{ text: { content: 'نصب Python و محیط توسعه' } }] },
      'Order':      { number: 2 },
      'Has_Quiz':   { checkbox: true },
      'Content':    { rich_text: [{ text: { content: lessonContents.l2 } }] },
      '🎓 Topics':  { relation: [{ id: topic1.id }] },
      '🎓 Courses': { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ درس ۲ (با آزمون) ساخته شد');

  // ── ۵. درس‌های موضوع ۲ ──
  await notion.pages.create({
    parent: { data_source_id: LESSONS },
    properties: {
      'Name':       { title: [{ text: { content: 'متغیرها در Python' } }] },
      'Order':      { number: 1 },
      'Has_Quiz':   { checkbox: false },
      'Content':    { rich_text: [{ text: { content: lessonContents.l3 } }] },
      '🎓 Topics':  { relation: [{ id: topic2.id }] },
      '🎓 Courses': { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ درس ۳ ساخته شد');

  await notion.pages.create({
    parent: { data_source_id: LESSONS },
    properties: {
      'Name':       { title: [{ text: { content: 'عملگرها و محاسبات' } }] },
      'Order':      { number: 2 },
      'Has_Quiz':   { checkbox: true },
      'Content':    { rich_text: [{ text: { content: lessonContents.l4 } }] },
      '🎓 Topics':  { relation: [{ id: topic2.id }] },
      '🎓 Courses': { relation: [{ id: course.id }] },
    },
  });
  console.log('✅ درس ۴ (با آزمون) ساخته شد');

  console.log('\n🎉 همه داده‌های نمونه با موفقیت در Notion ایجاد شدند!');
}

seed().catch(e => {
  console.error('❌ خطا:', e.message);
  process.exit(1);
});
