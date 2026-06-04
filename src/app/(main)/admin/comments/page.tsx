import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { approveComment, rejectComment } from './actions';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const metadata = { title: 'مدیریت کامنت‌ها' };

type RawComment = {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  topic_id: string;
  user_id: string;
  is_public_consent: boolean;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  email: string | null;
};

type CommentRow = RawComment & { profile: Profile | null };

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:  { label: 'در انتظار',  color: '#92400e', bg: '#fef3c7', icon: <Clock size={13} /> },
  approved: { label: 'تأیید شده', color: '#166534', bg: '#dcfce7', icon: <CheckCircle size={13} /> },
  rejected: { label: 'رد شده',    color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={13} /> },
};

export default async function AdminCommentsPage() {
  // ── Auth guard ───────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (myProfile?.role !== 'admin') redirect('/');

  // ── Fetch ALL comments (service role bypasses RLS) ──────────
  // NOTE: We do NOT join profiles here because comments.user_id
  //       references auth.users, not public.profiles — PostgREST
  //       has no direct FK path and silently returns 0 rows if you
  //       try. Instead: two queries + merge in JS.
  const service = await createServiceClient();

  const { data: rawComments, error: commentsError } = await service
    .from('comments')
    .select('id, content, status, created_at, topic_id, user_id, is_public_consent')
    .order('created_at', { ascending: false });

  if (commentsError) {
    console.error('Admin comments fetch error:', commentsError.code, commentsError.message, commentsError.details);
  }

  const comments = (rawComments ?? []) as RawComment[];

  // ── Fetch profiles for the returned user_ids ─────────────────
  const userIds = [...new Set(comments.map(c => c.user_id))];
  let profileMap: Record<string, Profile> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await service
      .from('profiles')
      .select('user_id, display_name, email')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Admin profiles fetch error:', profilesError.code, profilesError.message);
    }

    profileMap = Object.fromEntries(
      (profiles ?? []).map((p: Profile) => [p.user_id, p])
    );
  }

  // ── Merge ─────────────────────────────────────────────────────
  const rows: CommentRow[] = comments.map(c => ({
    ...c,
    profile: profileMap[c.user_id] ?? null,
  }));

  const counts = {
    pending:  rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  return (
    <div dir="rtl" className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-chat-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">مدیریت کامنت‌ها</h1>
            <p className="text-sm text-slate-500 mt-1">بررسی و تأیید بازتاب‌های یادگیری کاربران</p>
          </div>
          <a href="/admin" className="text-sm text-indigo-600 hover:underline">← پنل ادمین</a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {(['pending', 'approved', 'rejected'] as const).map(s => (
            <div
              key={s}
              className="rounded-2xl px-5 py-4 text-center"
              style={{ backgroundColor: STATUS_META[s].bg }}
            >
              <p className="text-2xl font-black" style={{ color: STATUS_META[s].color }}>{counts[s]}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: STATUS_META[s].color }}>{STATUS_META[s].label}</p>
            </div>
          ))}
        </div>

        {/* Debug: show fetch error if any */}
        {commentsError && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
            خطا در دریافت کامنت‌ها: {commentsError.message}
          </div>
        )}

        {/* Table */}
        {rows.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">
            {commentsError ? 'خطا در بارگذاری — لاگ سرور را بررسی کنید.' : 'هیچ کامنتی ثبت نشده است.'}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                  {['نام / ایمیل', 'محتوا', 'Topic ID', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                    <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const st = STATUS_META[row.status] ?? STATUS_META.pending;
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}
                    >
                      {/* User */}
                      <td className="px-4 py-3 min-w-[140px]">
                        <p className="font-medium text-slate-700">
                          {row.profile?.display_name ?? <span className="text-slate-400 italic text-xs">بدون نام</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {row.profile?.email ?? row.user_id.slice(0, 12) + '…'}
                        </p>
                      </td>

                      {/* Content */}
                      <td className="px-4 py-3 text-slate-600 max-w-[260px]">
                        <p className="line-clamp-2 leading-relaxed">{row.content}</p>
                        {row.is_public_consent && (
                          <span className="inline-block mt-1 text-xs text-indigo-500">عمومی</span>
                        )}
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono max-w-[100px] truncate">
                        {row.topic_id}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleDateString('fa-IR', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: st.bg, color: st.color }}
                        >
                          {st.icon}{st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.status !== 'approved' && (
                            <form action={approveComment.bind(null, row.id)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
                                style={{ backgroundColor: '#16a34a' }}
                              >
                                <CheckCircle size={12} /> تأیید
                              </button>
                            </form>
                          )}
                          {row.status !== 'rejected' && (
                            <form action={rejectComment.bind(null, row.id)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90"
                                style={{ backgroundColor: '#dc2626' }}
                              >
                                <XCircle size={12} /> رد
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
