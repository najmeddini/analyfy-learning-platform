import { createClient } from '@/lib/supabase/server';
import Sidebar from '@/components/sidebar/Sidebar';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile only for authenticated users
  const profile = user
    ? (await supabase.from('profiles').select('*').eq('user_id', user.id).single()).data
    : null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      <Sidebar user={user} profile={profile} />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
