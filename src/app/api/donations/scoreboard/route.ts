import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('donations')
    .select('id, donor_name, amount, created_at')
    .order('amount', { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ donations: data });
}
