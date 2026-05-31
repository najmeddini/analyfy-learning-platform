import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const topic_id = formData.get('topic_id') as string | null;
  const max_size_mb = Number(formData.get('max_size_mb') ?? 5);
  const allowed_extensions = (formData.get('allowed_extensions') as string | null) ?? '';

  if (!file || !topic_id) {
    return NextResponse.json({ error: 'file and topic_id required' }, { status: 400 });
  }

  // Server-side size check
  if (file.size > max_size_mb * 1024 * 1024) {
    return NextResponse.json({ error: `حجم فایل بیش از ${max_size_mb}MB است` }, { status: 422 });
  }

  // Server-side extension check
  if (allowed_extensions) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const allowed = allowed_extensions.split(',').map((e) => e.trim());
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: `پسوند ${ext} مجاز نیست` }, { status: 422 });
    }
  }

  const filePath = `${user.id}/${topic_id}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('projects')
    .upload(filePath, file, { upsert: false });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: urlData } = supabase.storage.from('projects').getPublicUrl(filePath);

  const { data, error } = await supabase.from('projects').insert({
    user_id: user.id,
    topic_id,
    file_url: urlData.publicUrl,
    status: 'pending',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}
