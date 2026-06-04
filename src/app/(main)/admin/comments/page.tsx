import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { approveComment, rejectComment } from './actions';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export const metadata = { title: 'مدیریت کامنت‌ها' };

type CommentRow = {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  topic_id: string;
  is_public_consent: boolean;
  profiles: { display_name: string | null } | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:  { label: 'در انتظار',  color: '#92400e', icon: <Clock size={13} /> },
  approved: { label: 'تأیید شده', color: '#166534', icon: <CheckCircle size={13} /> },
  rejected: { label: 'رد شده',    color: '#991b1b', icon: <XCircle size={13} /> },
};

const STATUS_BG: Record<string, string> = {
  pending:  '#fef3c7',
  approved: '#dcfce7',
  rejected: '#fee2e2',
};

export default async function AdminCommentsPage() {
  // Auth guard — same pattern as /admin
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect('/');

  // Fetch ALL comments with service role (bypasses RLS)
  const service = await createServiceClient();
  const { data: comments, error } = await service
    .from('comments')
    .select('id, content, status, created_at, topic_id, is_public_consent, profiles(display_name)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin comments fetch error:', error);
  }

  const rows = (comments ?? []) as unknown as CommentRow[];
  const pending  = rows.filter(r => r.status === 'pending').length;
  const approved = rows.filter(r => r.status === 'approved').length;
  const rejected = rows.filter(r => r.status === 'rejected').length;

  return (
    <div
      dir="rtl"
      className="flex-1 overflow-y-auto p-6"
      style={{ backgroundColor: 'var(--color-chat-bg)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">مدیریت کامنت‌ها</h1>
            <p className="text-sm text-slate-500 mt-1">بررسی و تأیید بازتاب‌های یادگیری کاربران</p>
          </div>
          <a
            href="/admin"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← پنل ادمین
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'در انتظار',   count: pending,  bg: '#fef3c7', color: '#92400e' },
            { label: 'تأیید شده',  count: approved, bg: '#dcfce7', color: '#166534' },
            { label: 'رد شده',     count: rejected, bg: '#fee2e2', color: '#991b1b' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-2xl px-5 py-4 text-center"
              style={{ backgroundColor: s.bg }}
            >
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.count}</p>
              <p className="text-xs font-medium mt-0.5" style={{ color: s.color }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        {rows.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-sm">هیچ کامنتی ثبت نشده است.</div>
        ) : (
          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                  {['کاربر', 'محتوا', 'Topic ID', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const st = STATUS_LABEL[row.status] ?? STATUS_LABEL.pending;
                  const isPending = row.status === 'pending';
                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? 'white' : '#fafafa' }}
                    >
                      {/* User */}
                      <td className="px-4 py-3 whitespace-nowrap text-slate-700 font-medium">
                        {row.profiles?.display_name ?? '—'}
                      </td>

                      {/* Content */}
                      <td className="px-4 py-3 text-slate-600 max-w-xs">
                        <p className="line-clamp-2 leading-relaxed">{row.content}</p>
                        {row.is_public_consent && (
                          <span className="inline-block mt-1 text-xs text-indigo-500">عمومی</span>
                        )}
                      </td>

                      {/* Topic */}
                      <td className="px-4 py-3 text-slate-400 text-xs font-mono max-w-[120px] truncate">
                        {row.topic_id}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleDateString('fa-IR', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
                          style={{ backgroundColor: STATUS_BG[row.status], color: st.color }}
                        >
                          {st.icon}
                          {st.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.status !== 'approved' && (
                            <form action={approveComment.bind(null, row.id)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                                style={{ backgroundColor: '#16a34a' }}
                              >
                                <CheckCircle size={12} />
                                تأیید
                              </button>
                            </form>
                          )}
                          {row.status !== 'rejected' && (
                            <form action={rejectComment.bind(null, row.id)}>
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                                style={{ backgroundColor: '#dc2626' }}
                              >
                                <XCircle size={12} />
                                رد
                              </button>
                            </form>
                          )}
                          {!isPending && (
                            <form action={approveComment.bind(null, row.id)}>
                              {/* reset back to pending not needed for MVP */}
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
