import Link from 'next/link';
import { getCourses } from '@/lib/notion/client';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import JsonLd from '@/components/ui/JsonLd';
import StarRating from '@/components/ui/StarRating';
import { BookOpen, ChevronLeft, Lock, Users, MessageSquare } from 'lucide-react';
import type { Metadata } from 'next';
import type { CourseStats } from '@/types';

export const metadata: Metadata = {
  title: 'کاوش دوره‌ها',
  description: 'مجموعه دوره‌های آموزشی تعاملی — یادگیری مکالمه‌محور با هوش مصنوعی',
};

export const revalidate = 300; // 5-min ISR

async function getCourseStats(courseIds: string[]): Promise<Record<string, CourseStats>> {
  if (courseIds.length === 0) return {};
  const supabase = await createServiceClient();

  const [{ data: ratings }, { data: progress }, { data: comments }] = await Promise.all([
    supabase.from('course_ratings').select('course_id, rating'),
    supabase.from('user_progress').select('user_id, topic_id'),
    supabase.from('comments').select('topic_id').eq('status', 'approved'),
  ]);

  const statsMap: Record<string, CourseStats> = {};
  for (const courseId of courseIds) {
    const courseRatings = (ratings ?? [])
      .filter(r => r.course_id === courseId)
      .map(r => r.rating as number);
    const avg = courseRatings.length > 0
      ? courseRatings.reduce((s, r) => s + r, 0) / courseRatings.length
      : 0;

    statsMap[courseId] = {
      avg_rating: Math.round(avg * 10) / 10,
      rating_count: courseRatings.length,
      student_count: new Set((progress ?? []).map(p => p.user_id)).size,
      comment_count: (comments ?? []).length,
    };
  }
  return statsMap;
}

export default async function ExplorePage() {
  const courses = await getCourses();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const stats = await getCourseStats(courses.map(c => c.id));

  const userRatings: Record<string, number> = {};
  if (user) {
    const svc = await createServiceClient();
    const { data: ownRatings } = await svc
      .from('course_ratings')
      .select('course_id, rating')
      .eq('user_id', user.id);
    for (const r of ownRatings ?? []) userRatings[r.course_id] = r.rating;
  }

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'دوره‌های آموزشی آکادمی آنالیفای',
    itemListElement: courses.map((course, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: course.title,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/course/${course.slug}`,
    })),
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold">کاوش دوره‌ها</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
              یک دوره انتخاب کن و یادگیری را شروع کن
            </p>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <BookOpen size={40} className="mx-auto opacity-30" />
              <p style={{ color: 'var(--color-muted-foreground)' }}>هنوز دوره‌ای منتشر نشده</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {courses.map((course) => {
                const isPremium = course.access_type === 'Premium';
                const courseStats = stats[course.id];
                const userRating = userRatings[course.id] ?? 0;

                return (
                  <Link
                    key={course.id}
                    href={`/course/${course.slug}`}
                    className="group relative rounded-3xl border overflow-hidden hover:shadow-lg transition-all hover:-translate-y-0.5 flex flex-col"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
                  >
                    {/* Cover */}
                    {course.cover_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={course.cover_image} alt={course.title} className="w-full h-36 object-cover" />
                    ) : (
                      <div className="w-full h-36 flex items-center justify-center" style={{ backgroundColor: '#6c63ff18' }}>
                        <BookOpen size={36} style={{ color: '#6c63ff' }} />
                      </div>
                    )}

                    {isPremium && (
                      <div className="absolute inset-x-0 top-0 h-36 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
                        <div className="flex flex-col items-center gap-1 text-white">
                          <Lock size={28} />
                          <span className="text-xs font-bold">دوره پریمیوم</span>
                        </div>
                      </div>
                    )}

                    <div className="p-4 flex flex-col gap-2 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="font-bold text-sm leading-snug">{course.title}</h2>
                        <ChevronLeft size={16} className="flex-shrink-0 mt-0.5 transition-transform group-hover:-translate-x-1" style={{ color: 'var(--color-muted-foreground)' }} />
                      </div>

                      {/* Dynamic stats */}
                      {courseStats && (courseStats.student_count > 0 || courseStats.comment_count > 0) && (
                        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                          {courseStats.student_count > 0 && (
                            <span className="flex items-center gap-1">
                              <Users size={11} /> {courseStats.student_count.toLocaleString('fa-IR')} دانشجو
                            </span>
                          )}
                          {courseStats.comment_count > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare size={11} /> {courseStats.comment_count.toLocaleString('fa-IR')} نظر
                            </span>
                          )}
                        </div>
                      )}

                      {/* Rating + badge row */}
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <StarRating
                          courseId={course.id}
                          initialRating={userRating}
                          avgRating={courseStats?.avg_rating ?? 0}
                          ratingCount={courseStats?.rating_count ?? 0}
                          readonly={!user}
                        />
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={isPremium
                            ? { backgroundColor: '#f59e0b18', color: '#d97706' }
                            : { backgroundColor: '#22c55e18', color: '#16a34a' }
                          }
                        >
                          {isPremium ? '⭐ پریمیوم' : 'رایگان'}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
