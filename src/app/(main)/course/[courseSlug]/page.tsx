import { notFound } from 'next/navigation';
import { getCourses, getTopicsByCourse } from '@/lib/notion/client';
import { extractNotionId } from '@/lib/utils';
import JsonLd from '@/components/ui/JsonLd';
import CourseDetailClient from './CourseDetailClient';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ courseSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { courseSlug } = await params;
  const courseId = extractNotionId(courseSlug);
  const courses = await getCourses();
  const course = courses.find((c) => c.id === courseId);
  return {
    title: course?.title ?? 'دوره',
    description: `سرفصل‌ها و درس‌های دوره ${course?.title ?? ''}`,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { courseSlug } = await params;
  const courseId = extractNotionId(courseSlug);

  const courses = await getCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) notFound();

  const topics = await getTopicsByCourse(courseId);

  const courseSchema = {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: course.title,
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/course/${courseSlug}`,
    inLanguage: 'fa',
    educationalLevel: 'beginner',
    isAccessibleForFree: course.access_type !== 'Premium',
    provider: {
      '@type': 'Organization',
      name: 'آکادمی آنالیفای',
      url: process.env.NEXT_PUBLIC_SITE_URL,
    },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
      courseWorkload: `PT${topics.length}H`,
    },
    syllabusSections: topics.map((topic, idx) => ({
      '@type': 'Syllabus',
      name: topic.title,
      position: idx + 1,
    })),
  };

  return (
    <>
      <JsonLd data={courseSchema} />
      <CourseDetailClient
        courseId={courseId}
        courseSlug={courseSlug}
        courseTitle={course.title}
      />
    </>
  );
}
