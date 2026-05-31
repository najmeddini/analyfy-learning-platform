import { NextResponse } from 'next/server';
import { getProjectsByCourse } from '@/lib/notion/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('courseId');

  if (!courseId) {
    return NextResponse.json({ error: 'courseId is required' }, { status: 400 });
  }

  const projects = await getProjectsByCourse(courseId);
  return NextResponse.json({ projects });
}
