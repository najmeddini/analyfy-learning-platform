/**
 * Legacy route — redirects to the canonical hierarchical URL.
 * Used by: sidebar recent threads, search modal, old bookmarks.
 * Canonical form: /course/[courseSlug]/lesson/[lessonSlug]
 */
import { redirect, notFound } from 'next/navigation';
import { getLessonById, getCourses, getTopicsByCourse } from '@/lib/notion/client';
import { makeRouteSlug } from '@/lib/utils';

interface Props {
  params: Promise<{ lessonId: string }>;
}

export default async function LearnRedirectPage({ params }: Props) {
  const { lessonId } = await params;

  const lesson = await getLessonById(lessonId);
  if (!lesson) notFound();

  // Find which course owns this lesson's topic
  const courses = await getCourses();
  for (const course of courses) {
    const topics = await getTopicsByCourse(course.id);
    if (topics.some((t) => t.id === lesson.topic_id)) {
      const courseSlug = makeRouteSlug(course.title, course.id);
      // lesson.slug was produced by makeRouteSlug(title, id) in the Notion client
      redirect(`/course/${courseSlug}/lesson/${lesson.slug}`);
    }
  }

  notFound();
}
