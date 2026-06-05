import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const metadata = { title: 'ردیابی دعوتنامه‌ها' };
export const revalidate = 0;

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  email: string | null;
  invite_code: string | null;
  invite_quota: number;
  invite_created_at: string | null;
  invited_by: string | null;
};

export default async function AdminInvitesPage() {
  // ── Auth guard ────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (myProfile?.role !== 'admin') redirect('/');

  // ── Service-role client — bypasses RLS ───────────────────
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: rawProfiles, error } = await adminClient
    .from('profiles')
    .select('user_id, display_name, email, invite_code, invite_quota, invite_created_at, invited_by')
    .order('invite_created_at', { ascending: false });

  const profiles: ProfileRow[] = (rawProfiles ?? []) as ProfileRow[];

  // Build a map: user_id → count of profiles with invited_by = that user_id
  const inviteCountMap: Record<string, number> = {};
  for (const p of profiles) {
    if (p.invited_by) {
      inviteCountMap[p.invited_by] = (inviteCountMap[p.invited_by] ?? 0) + 1;
    }
  }

  // Waitlist count
  const { count: waitlistCount } = await adminClient
    .from('waitlist')
    .select('id', { count: 'exact', head: true });

  const totalInvited = profiles.filter(p => p.invited_by !== null).length;
  const totalQuota   = profiles.reduce((s, p) => s + (p.invite_quota ?? 10), 0);

  return (
    <div dir="rtl" className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-chat-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">ردیابی دعوتنامه‌ها</h1>
            <p className="text-sm text-slate-500 mt-1">
              عملکرد مارکتینگ و شبکه دعوت کاربران
            </p>
          </div>
          <a href="/admin" className="text-sm text-indigo-600 hover:underline">← پنل ادمین</a>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="کل کاربران" value={profiles.length} color="#6c63ff" />
          <StatCard label="دعوت شده‌ها" value={totalInvited} color="#16a34a" />
          <StatCard label="لیست انتظار" value={waitlistCount ?? 0} color="#f59e0b" />
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
            خطا در دریافت داده: {error.message}
          </div>
        )}

        {/* Table */}
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                {['کاربر', 'کد دعوت', 'سقف دعوت', 'دعوت‌شده‌ها', 'نسبت', 'تاریخ عضویت'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {profiles.map((row, i) => {
                const invited = inviteCountMap[row.user_id] ?? 0;
                const quota   = row.invite_quota ?? 10;
                const pct     = quota > 0 ? Math.round((invited / quota) * 100) : 0;

                return (
                  <tr
                    key={row.user_id}
                    className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                    style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}
                  >
                    {/* User */}
                    <td className="px-4 py-3 min-w-[180px]">
                      <p className="font-medium text-slate-700 truncate max-w-[160px]">
                        {row.display_name ?? <span className="text-slate-400 italic text-xs">بدون نام</span>}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[160px]">
                        {row.email ?? row.user_id.slice(0, 16) + '…'}
                      </p>
                    </td>

                    {/* Invite code */}
                    <td className="px-4 py-3">
                      {row.invite_code ? (
                        <span
                          className="font-mono font-bold tracking-widest text-xs px-2.5 py-1 rounded-lg"
                          style={{ backgroundColor: '#f5f3ff', color: '#6c63ff' }}
                        >
                          {row.invite_code}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs italic">—</span>
                      )}
                    </td>

                    {/* Quota */}
                    <td className="px-4 py-3 text-slate-600 font-medium">
                      {quota}
                    </td>

                    {/* Invited count */}
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold"
                        style={{
                          backgroundColor: invited > 0 ? '#dcfce7' : '#f1f5f9',
                          color:           invited > 0 ? '#16a34a' : '#94a3b8',
                        }}
                      >
                        {invited}
                      </span>
                    </td>

                    {/* Progress bar */}
                    <td className="px-4 py-3 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full overflow-hidden bg-slate-100">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: pct >= 100 ? '#dc2626' : pct > 50 ? '#f59e0b' : '#6c63ff',
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-400 flex-shrink-0">{pct}٪</span>
                      </div>
                    </td>

                    {/* Join date */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {row.invite_created_at
                        ? new Date(row.invite_created_at).toLocaleDateString('fa-IR', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {profiles.length === 0 && (
            <div className="text-center py-16 text-slate-400 text-sm">
              هیچ کاربری ثبت نشده.
            </div>
          )}
        </div>

        {/* Footer note */}
        <p className="text-xs text-slate-400 text-center">
          مجموع ظرفیت تخصیص‌یافته: {totalQuota.toLocaleString('fa-IR')} · داده‌ها لحظه‌ای هستند
        </p>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      className="rounded-2xl px-5 py-4 text-center border"
      style={{ borderColor: `${color}30`, backgroundColor: `${color}08` }}
    >
      <p className="text-3xl font-black" style={{ color }}>
        {value.toLocaleString('fa-IR')}
      </p>
      <p className="text-xs font-medium mt-1 text-slate-500">{label}</p>
    </div>
  );
}
