import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getLessonById, getTopicsByCourse, getCourses } from '@/lib/notion/client';
import { createClient } from '@/lib/supabase/server';
import LessonChatShell from '@/components/chat/LessonChatShell';
import JsonLd from '@/components/ui/JsonLd';
import type { Lesson, Topic } from '@/types';

// Bot detection — Googlebot must see full content without animation
function isBot(userAgent: string): boolean {
  const botPatterns = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot|facebot|ia_archiver/i;
  return botPatterns.test(userAgent);
}

interface Props {
  params: Promise<{ lessonId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { lessonId } = await params;
  const lesson = await getLessonById(lessonId);
  return {
    title: lesson ? `${lesson.title} | پلتفرم یادگیری` : 'درس',
    description: lesson?.content?.slice(0, 150) ?? '',
  };
}

export default async function LearnPage({ params }: Props) {
  const { lessonId } = await params;

  // Fetch lesson server-side (SSR — Googlebot sees full content)
  const lesson = await getLessonById(lessonId);
  if (!lesson) notFound();

  // Fetch topic for bounty/project info
  let topic: Topic | null = null;
  if (lesson.topic_id) {
    const courses = await getCourses();
    for (const course of courses) {
      const topics = await getTopicsByCourse(course.id);
      const found = topics.find((t) => t.id === lesson.topic_id);
      if (found) { topic = found; break; }
    }
  }

  // Auth — nullable for guests
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Completed lessons for this user
  const completedLessonIds: string[] = [];
  if (user) {
    const { data } = await supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', user.id);
    completedLessonIds.push(...(data ?? []).map((r) => r.lesson_id));
  }

  // Bot check — skip animation for crawlers
  const headersList = await headers();
  const ua = headersList.get('user-agent') ?? '';
  const isSearchBot = isBot(ua);

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
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/learn/${lessonId}`,
      },
    },
  };

  return (
    <>
      <JsonLd data={qaSchema} />
      <LessonChatShell
        lesson={lesson}
        topic={topic}
        user={user ? { id: user.id, email: user.email ?? '' } : null}
        isBot={isSearchBot}
        isAlreadyCompleted={completedLessonIds.includes(lessonId)}
      />
    </>
  );
}
