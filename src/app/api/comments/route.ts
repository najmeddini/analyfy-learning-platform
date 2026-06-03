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

  const { topic_id, content, is_public_consent } = body;
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
  const { data: { user } } = await supabase.auth.getUser();

  // Authenticated: approved+public comments OR user's own (any status)
  // Guest: approved+public only
  let query = supabase
    .from('comments')
    .select('id, content, status, created_at, user_id, is_public_consent, profiles(display_name, avatar_url)')
    .eq('topic_id', topic_id)
    .order('created_at', { ascending: true });

  if (user) {
    query = query.or(
      `and(status.eq.approved,is_public_consent.eq.true),user_id.eq.${user.id}`
    );
  } else {
    query = query.eq('status', 'approved').eq('is_public_consent', true);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Comment GET error:', error.code, error.message, error.details);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ comments: data ?? [] });
}
