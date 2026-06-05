import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';
import InviteNetwork from './InviteNetwork';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تنظیمات',
  description: 'ویرایش پروفایل و تنظیمات حساب کاربری',
};

export const revalidate = 0;

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  // ── Invite network data ───────────────────────────────────────
  // 1. Users invited by the current user
  const { data: invitees } = await supabase
    .from('profiles')
    .select('user_id, display_name, email, created_at')
    .eq('invited_by', user.id)
    .order('created_at', { ascending: false });

  // 2. Who invited the current user (if any)
  let inviterName: string | null = null;
  if (profile?.invited_by) {
    const { data: inviter } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', profile.invited_by)
      .single();
    inviterName = inviter?.display_name ?? null;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-8" dir="rtl">
        <h1 className="text-2xl font-bold">تنظیمات</h1>

        <SettingsForm user={{ id: user.id, email: user.email ?? '' }} profile={profile} />

        <InviteNetwork
          inviteCode={profile?.invite_code ?? null}
          inviteQuota={profile?.invite_quota ?? 10}
          inviteCreatedAt={profile?.invite_created_at ?? new Date().toISOString()}
          invitees={(invitees ?? []).map(i => ({
            display_name: i.display_name,
            email: i.email ?? '',
            created_at: i.created_at,
          }))}
          inviterName={inviterName}
        />
      </div>
    </div>
  );
}
