import { NextResponse } from 'next/server';
import { getTopicsByCourse } from '@/lib/notion/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 });

  try {
    const topics = await getTopicsByCourse(courseId);
    return NextResponse.json({ topics });
  } catch (err) {
    console.error('Notion topics fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
