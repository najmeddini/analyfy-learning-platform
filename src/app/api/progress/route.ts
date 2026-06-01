import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lesson_id, topic_id, lesson_title, course_slug, lesson_slug } = await request.json();
  if (!lesson_id || !topic_id) {
    return NextResponse.json({ error: 'lesson_id and topic_id required' }, { status: 400 });
  }

  const { error } = await supabase.from('user_progress').upsert(
    {
      user_id: user.id,
      lesson_id,
      topic_id,
      lesson_title: lesson_title ?? null,
      course_slug: course_slug ?? null,
      lesson_slug: lesson_slug ?? null,
      completed_at: new Date().toISOString(),
      last_reviewed: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic_id = searchParams.get('topic_id');
  const limit = parseInt(searchParams.get('limit') ?? '50');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const query = supabase
    .from('user_progress')
    .select('lesson_id, topic_id, lesson_title, completed_at, last_reviewed, course_slug, lesson_slug')
    .eq('user_id', user.id)
    .order('last_reviewed', { ascending: false })
    .limit(limit);

  if (topic_id) query.eq('topic_id', topic_id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ progress: data });
}
