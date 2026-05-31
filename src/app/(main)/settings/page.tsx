import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from './SettingsForm';
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

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">تنظیمات</h1>
        <SettingsForm user={{ id: user.id, email: user.email ?? '' }} profile={profile} />
      </div>
    </div>
  );
}
