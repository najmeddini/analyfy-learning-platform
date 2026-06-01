import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getCourses, getTopicsByCourse } from '@/lib/notion/client';
import { formatDate, makeRouteSlug } from '@/lib/utils';
import { BookOpen, CheckCircle, Clock, FolderOpen } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تاریخچه یادگیری',
  description: 'دوره‌ها و درس‌هایی که تاکنون دیده‌اید',
};

export const revalidate = 0; // always fresh

interface ProgressRow {
  lesson_id: string;
  lesson_title: string | null;
  topic_id: string;
  completed_at: string;
  last_reviewed: string | null;
}

interface CourseProgress {
  courseId: string;
  courseTitle: string;
  coverImage: string | null;
  totalLessons: number;
  completedLessons: number;
  lastReviewed: string | null;
  completedTopicIds: Set<string>;
}

export default async function HistoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get all user progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('lesson_id, lesson_title, topic_id, completed_at, last_reviewed')
    .eq('user_id', user.id)
    .order('last_reviewed', { ascending: false });

  const rows: ProgressRow[] = progress ?? [];

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <Clock size={40} className="mx-auto opacity-30" />
          <p className="font-medium">هنوز درسی شروع نشده</p>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            از بخش دوره‌ها یادگیری را شروع کنید
          </p>
          <Link
            href="/explore"
            className="inline-block px-5 py-2.5 rounded-2xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#6c63ff' }}
          >
            کاوش دوره‌ها
          </Link>
        </div>
      </div>
    );
  }

  // Build a map: topic_id → Set of completed lesson_ids
  const completedByTopic = new Map<string, Set<string>>();
  for (const row of rows) {
    if (!completedByTopic.has(row.topic_id)) completedByTopic.set(row.topic_id, new Set());
    completedByTopic.get(row.topic_id)!.add(row.lesson_id);
  }

  // Get all courses and build per-course progress
  const courses = await getCourses();
  const courseProgressMap = new Map<string, CourseProgress>();

  await Promise.all(
    courses.map(async (course) => {
      const topics = await getTopicsByCourse(course.id);
      let totalLessons = 0;
      let completedLessons = 0;
      let lastReviewed: string | null = null;
      const completedTopicIds = new Set<string>();

      for (const topic of topics) {
        const done = completedByTopic.get(topic.id) ?? new Set();
        completedLessons += done.size;
        if (done.size > 0) completedTopicIds.add(topic.id);
      }

      // Count total lessons
      const allLessonsForCourse = rows.filter((r) =>
        topics.some((t) => t.id === r.topic_id)
      );
      if (allLessonsForCourse.length > 0) {
        totalLessons = Math.max(completedLessons, allLessonsForCourse.length);
        lastReviewed = allLessonsForCourse.sort((a, b) =>
          (b.last_reviewed ?? '') > (a.last_reviewed ?? '') ? 1 : -1
        )[0]?.last_reviewed ?? null;
      }

      if (completedLessons > 0) {
        courseProgressMap.set(course.id, {
          courseId: course.id,
          courseTitle: course.title,
          coverImage: course.cover_image,
          totalLessons,
          completedLessons,
          lastReviewed,
          completedTopicIds,
        });
      }
    })
  );

  const activeCourses = [...courseProgressMap.values()].sort((a, b) =>
    (b.lastReviewed ?? '') > (a.lastReviewed ?? '') ? 1 : -1
  );

  // Recent lesson threads (last 20)
  const recentLessons = rows.slice(0, 20);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">تاریخچه یادگیری</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            {rows.length.toLocaleString('fa-IR')} درس تکمیل‌شده
          </p>
        </div>

        {/* Course progress cards */}
        {activeCourses.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">دوره‌های در جریان</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeCourses.map((cp) => {
                const pct = cp.totalLessons > 0
                  ? Math.round((cp.completedLessons / cp.totalLessons) * 100)
                  : 0;
                return (
                  <Link
                    key={cp.courseId}
                    href={`/course/${makeRouteSlug(cp.courseTitle, cp.courseId)}`}
                    className="rounded-2xl border overflow-hidden hover:shadow-md transition-all hover:-translate-y-0.5"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
                  >
                    {cp.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cp.coverImage} alt={cp.courseTitle} className="w-full h-24 object-cover" />
                    )}
                    <div className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-sm leading-snug">{cp.courseTitle}</p>
                        <span className="text-xs font-bold flex-shrink-0" style={{ color: '#6c63ff' }}>
                          {pct.toLocaleString('fa-IR')}٪
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: '#6c63ff' }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        <span className="flex items-center gap-1">
                          <CheckCircle size={11} />
                          {cp.completedLessons.toLocaleString('fa-IR')} درس
                        </span>
                        {cp.lastReviewed && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatDate(cp.lastReviewed)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Recent lesson activity */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">فعالیت اخیر</h2>
          <div
            className="rounded-2xl border overflow-hidden divide-y"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {recentLessons.map((lesson) => (
              <Link
                key={`${lesson.lesson_id}-${lesson.completed_at}`}
                href={`/learn/${lesson.lesson_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-muted)] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#22c55e18' }}
                >
                  <BookOpen size={14} style={{ color: '#16a34a' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {lesson.lesson_title ?? `درس ${lesson.lesson_id.slice(0, 8)}`}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {lesson.last_reviewed ? formatDate(lesson.last_reviewed) : formatDate(lesson.completed_at)}
                  </p>
                </div>
                <FolderOpen size={14} style={{ color: 'var(--color-muted-foreground)' }} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
