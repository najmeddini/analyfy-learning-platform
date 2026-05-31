import { NextResponse } from 'next/server';
import { searchLessons } from '@/lib/notion/client';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchLessons(q);
  return NextResponse.json({ results });
}
