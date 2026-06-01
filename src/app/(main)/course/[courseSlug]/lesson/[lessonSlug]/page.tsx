import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getLessonBySlug, getNextLessonUrl, getTopicsByCourse, getCourses } from '@/lib/notion/client';
import { createClient } from '@/lib/supabase/server';
import LessonChatShell from '@/components/chat/LessonChatShell';
import JsonLd from '@/components/ui/JsonLd';

// Bot detection — Googlebot sees full content without animation
function isBot(userAgent: string): boolean {
  return /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver/i.test(userAgent);
}

interface Props {
  params: Promise<{ courseSlug: string; lessonSlug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;
  const lesson = await getLessonBySlug(courseSlug, lessonSlug);
  return {
    title: lesson?.title ?? 'درس',
    description: lesson?.content?.slice(0, 150) ?? '',
  };
}

export default async function LessonPage({ params }: Props) {
  const { courseSlug, lessonSlug } = await params;

  // Slug-based lookup — no UUID reconstruction needed
  const lesson = await getLessonBySlug(courseSlug, lessonSlug);
  if (!lesson) notFound();

  // Resolve topic and next lesson URL in parallel with auth check
  const courses = await getCourses();
  const course = courses.find(c => c.slug === courseSlug);
  const topics = course ? await getTopicsByCourse(course.id) : [];
  const topic = topics.find(t => t.id === lesson.topic_id) ?? null;

  const [nextLessonUrl, supabase] = await Promise.all([
    getNextLessonUrl(courseSlug, lesson),
    createClient(),
  ]);

  const { data: { user } } = await supabase.auth.getUser();

  const completedLessonIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id);
    completedLessonIds.push(...(data ?? []).map((r) => r.lesson_id));
  }

  const headersList = await headers();
  const ua = headersList.get('user-agent') ?? '';

  const qaSchema = {
    '@context': 'https://schema.org',
    '@type': 'QAPage',
    mainEntity: {
      '@type': 'Question',
      name: lesson.title,
      text: lesson.content.slice(0, 300),
      answerCount: 1,
      acceptedAnswer: {
        '@type': 'Answer',
        text: lesson.content.slice(0, 500),
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/course/${courseSlug}/lesson/${lessonSlug}`,
      },
    },
  };

  return (
    <>
      <JsonLd data={qaSchema} />
      <LessonChatShell
        lesson={lesson}
        topic={topic}
        courseSlug={courseSlug}
        lessonSlug={lessonSlug}
        nextLessonUrl={nextLessonUrl}
        user={user ? { id: user.id, email: user.email ?? '' } : null}
        isBot={isBot(ua)}
        isAlreadyCompleted={completedLessonIds.includes(lesson.id)}
      />
    </>
  );
}
