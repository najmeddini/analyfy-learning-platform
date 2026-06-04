'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');
}

export async function approveComment(commentId: string) {
  await assertAdmin();
  const service = await createServiceClient();
  const { error } = await service
    .from('comments')
    .update({ status: 'approved' })
    .eq('id', commentId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/comments');
}

export async function rejectComment(commentId: string) {
  await assertAdmin();
  const service = await createServiceClient();
  const { error } = await service
    .from('comments')
    .update({ status: 'rejected' })
    .eq('id', commentId);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/comments');
}
