'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (profile?.role !== 'admin') redirect('/');

  return user;
}

export async function approveComment(commentId: string) {
  await assertAdmin();
  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await service
    .from('comments').update({ status: 'approved' }).eq('id', commentId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/comments');
}

export async function rejectComment(commentId: string) {
  await assertAdmin();
  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await service
    .from('comments').update({ status: 'rejected' }).eq('id', commentId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/comments');
}

export async function bulkApproveComments(ids: string[]) {
  await assertAdmin();
  if (!ids.length) return;
  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await service
    .from('comments')
    .update({ status: 'approved' })
    .in('id', ids);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/comments');
}

export async function replyAndApprove(
  parentId: string,
  replyContent: string,
  context: { topic_id: string; course_id: string | null; lesson_id: string | null }
) {
  const admin = await assertAdmin();
  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Fetch original comment to inherit context if not provided
  const { data: original } = await service
    .from('comments').select('topic_id, course_id, lesson_id').eq('id', parentId).single();

  const topic_id  = context.topic_id  || original?.topic_id  || '';
  const course_id = context.course_id ?? original?.course_id ?? null;
  const lesson_id = context.lesson_id ?? original?.lesson_id ?? null;

  // 1. Insert admin reply (auto-approved, linked as thread)
  const { error: insertError } = await service.from('comments').insert({
    user_id:          admin.id,
    topic_id,
    course_id,
    lesson_id,
    content:          replyContent,
    parent_id:        parentId,
    status:           'approved',
    is_public_consent: true,
  });
  if (insertError) throw new Error(insertError.message);

  // 2. Auto-approve the original comment (replying implies approval)
  const { error: approveError } = await service
    .from('comments').update({ status: 'approved' }).eq('id', parentId);
  if (approveError) throw new Error(approveError.message);

  revalidatePath('/admin/comments');
}
