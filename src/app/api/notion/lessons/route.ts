import { NextResponse } from 'next/server';
import { getLessonsByTopic, getLessonById } from '@/lib/notion/client';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topicId');
  const lessonId = searchParams.get('lessonId');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    if (lessonId) {
      const lesson = await getLessonById(lessonId);
      return NextResponse.json({ lesson });
    }
    if (topicId) {
      const lessons = await getLessonsByTopic(topicId);
      return NextResponse.json({ lessons });
    }
    return NextResponse.json({ error: 'topicId or lessonId required' }, { status: 400 });
  } catch (err) {
    console.error('Notion lessons fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch lessons' }, { status: 500 });
  }
}
