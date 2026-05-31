import { NextResponse } from 'next/server';
import { getCourses } from '@/lib/notion/client';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const courses = await getCourses();
    return NextResponse.json({ courses });
  } catch (err) {
    console.error('Notion courses fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
