import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Filter } from 'bad-words';

const filter = new Filter();

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { topic_id, content, is_public_consent } = await request.json();
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic_id = searchParams.get('topic_id');
  if (!topic_id) return NextResponse.json({ error: 'topic_id required' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles(display_name, avatar_url)')
    .eq('topic_id', topic_id)
    .eq('status', 'approved')
    .eq('is_public_consent', true)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data });
}
