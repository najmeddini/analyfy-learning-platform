import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCourses, getTopicsByCourse, getLessonsByTopic } from '@/lib/notion/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.id !== userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: progress } = await supabase
    .from('user_progress')
    .select('lesson_id, topic_id, completed_at')
    .eq('user_id', user.id);

  const completedLessonIds = new Set((progress ?? []).map((p) => p.lesson_id));

  const courses = await getCourses();
  const completedCourses = [];

  for (const course of courses) {
    const topics = await getTopicsByCourse(course.id);
    let allLessonsDone = true;
    let latestCompletion = '';

    for (const topic of topics) {
      const lessons = await getLessonsByTopic(topic.id);
      for (const lesson of lessons) {
        if (!completedLessonIds.has(lesson.id)) {
          allLessonsDone = false;
          break;
        }
        const rec = progress?.find((p) => p.lesson_id === lesson.id);
        if (rec && rec.completed_at > latestCompletion) {
          latestCompletion = rec.completed_at;
        }
      }
      if (!allLessonsDone) break;
    }

    if (allLessonsDone && topics.length > 0) {
      completedCourses.push({
        courseId: course.id,
        courseTitle: course.title,
        completedAt: latestCompletion,
      });
    }
  }

  return NextResponse.json({ completedCourses });
}
