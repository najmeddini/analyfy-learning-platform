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

  // Identify the current user so we can mark is_own on each comment
  const { data: { user } } = await supabase.auth.getUser();

  // No manual status filter — Postgres RLS handles visibility:
  //   • "comments: own read"            → user sees their own (any status)
  //   • "comments: public approved read" → everyone sees approved+public_consent
  // NOTE: profiles(...) join is intentionally omitted — there is no direct FK
  // from comments.user_id to profiles.user_id in PostgREST. We do a separate
  // profiles query below and merge in JS (same pattern as admin page).
  const { data, error } = await supabase
    .from('comments')
    .select('id, content, status, created_at, user_id, is_public_consent, parent_id, lesson_id')
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Comment GET error:', error.code, error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const comments = data ?? [];

  // Fetch display names (two-query pattern — no direct FK to profiles)
  const userIds = [...new Set(comments.map(c => c.user_id))];
  let profileMap: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, display_name, avatar_url')
      .in('user_id', userIds);
    profileMap = Object.fromEntries(
      (profiles ?? []).map(p => [p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }])
    );
  }

  const enriched = comments.map(c => ({
    ...c,
    display_name: profileMap[c.user_id]?.display_name ?? null,
    avatar_url:   profileMap[c.user_id]?.avatar_url   ?? null,
    is_own: user ? c.user_id === user.id : false,
  }));

  return NextResponse.json({ comments: enriched });
}
