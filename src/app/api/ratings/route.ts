import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get('course_id');
  if (!courseId) return NextResponse.json({ error: 'course_id required' }, { status: 400 });

  const supabase = await createClient();

  // Aggregate stats
  const { data: agg } = await supabase
    .from('course_ratings')
    .select('rating')
    .eq('course_id', courseId);

  const ratings = (agg ?? []).map(r => r.rating as number);
  const avg = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;

  // User's own rating (if authenticated)
  const { data: { user } } = await supabase.auth.getUser();
  let userRating = 0;
  if (user) {
    const { data: own } = await supabase
      .from('course_ratings')
      .select('rating')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single();
    userRating = own?.rating ?? 0;
  }

  return NextResponse.json({
    avg_rating: Math.round(avg * 10) / 10,
    rating_count: ratings.length,
    user_rating: userRating,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { course_id, rating } = await request.json();
  if (!course_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { error } = await supabase.from('course_ratings').upsert(
    { user_id: user.id, course_id, rating },
    { onConflict: 'user_id,course_id' }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
