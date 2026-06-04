import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Filter } from 'bad-words';

const filter = new Filter();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });

  const { topic_id, content, is_public_consent, course_id, lesson_id } = body;
  if (!topic_id || !content) {
    return NextResponse.json({ error: 'topic_id and content required' }, { status: 400 });
  }

  if (filter.isProfane(content)) {
    return NextResponse.json(
      { error: 'متن حاوی کلمات نامناسب است. لطفاً ویرایش کنید.' },
      { status: 422 }
    );
  }

  const { data, error } = await supabase.from('comments').insert({
    user_id: user.id,
    topic_id,
    content,
    is_public_consent: is_public_consent ?? false,
    status: 'pending',
    course_id: course_id ?? null,
    lesson_id: lesson_id ?? null,
  }).select().single();

  if (error) {
    console.error('Comment POST error:', error.code, error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comment: data });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic_id = searchParams.get('topic_id');
  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

  const supabase = await createClient();

  // No manual status filter here — Postgres RLS handles visibility:
  //   • "comments: own read"           → user sees their own (any status)
  //   • "comments: public approved read" → everyone sees approved+public_consent
  // Combining both policies gives each user exactly what they should see.
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, status, created_at, user_id, is_public_consent, profiles(display_name, avatar_url)')
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Comment GET error:', error.code, error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data ?? [] });
}
