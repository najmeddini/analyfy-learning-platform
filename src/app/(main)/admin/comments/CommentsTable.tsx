'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, Clock, MessageSquarePlus, Send } from 'lucide-react';
import { approveComment, rejectComment, replyAndApprove } from './actions';

export type CommentRow = {
  id: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  topic_id: string;
  course_id: string | null;
  lesson_id: string | null;
  user_id: string;
  is_public_consent: boolean;
  parent_id: string | null;
  profile: { display_name: string | null; email: string | null } | null;
};

const STATUS_META = {
  pending:  { label: 'در انتظار',  color: '#92400e', bg: '#fef3c7', icon: <Clock size={13} /> },
  approved: { label: 'تأیید شده', color: '#166534', bg: '#dcfce7', icon: <CheckCircle size={13} /> },
  rejected: { label: 'رد شده',    color: '#991b1b', bg: '#fee2e2', icon: <XCircle size={13} /> },
} as const;

interface Props {
  rows: CommentRow[];
  distinctCourses: string[];
}

export default function CommentsTable({ rows, distinctCourses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [replyingTo, setReplyingTo]   = useState<string | null>(null);
  const [replyText,  setReplyText]    = useState('');
  const [isPending,  startTransition] = useTransition();

  // ── URL-based filters ─────────────────────────────────────────
  const statusFilter = searchParams.get('status') ?? 'all';
  const courseFilter = searchParams.get('course') ?? 'all';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key); else params.set(key, value);
    router.push(`/admin/comments?${params.toString()}`);
  }

  // ── Client-side filter on top of server data ──────────────────
  const visible = rows.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (courseFilter !== 'all' && r.course_id !== courseFilter) return false;
    return true;
  });

  const counts = {
    pending:  rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  // ── Action helpers ────────────────────────────────────────────
  function handleApprove(id: string) {
    startTransition(() => approveComment(id));
  }
  function handleReject(id: string) {
    startTransition(() => rejectComment(id));
  }
  function handleReply(id: string) {
    setReplyingTo(prev => (prev === id ? null : id));
    setReplyText('');
  }
  function submitReply(row: CommentRow) {
    if (!replyText.trim()) return;
    startTransition(async () => {
      await replyAndApprove(row.id, replyText.trim(), {
        topic_id: row.topic_id,
        course_id: row.course_id,
        lesson_id: row.lesson_id,
      });
      setReplyingTo(null);
      setReplyText('');
    });
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Stats ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {(['pending', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilter('status', statusFilter === s ? 'all' : s)}
            className="rounded-2xl px-5 py-4 text-center transition-all hover:scale-[1.02]"
            style={{
              backgroundColor: STATUS_META[s].bg,
              outline: statusFilter === s ? `2px solid ${STATUS_META[s].color}` : 'none',
            }}
          >
            <p className="text-2xl font-black" style={{ color: STATUS_META[s].color }}>{counts[s]}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: STATUS_META[s].color }}>{STATUS_META[s].label}</p>
          </button>
        ))}
      </div>

      {/* ── Filters ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white">
        <span className="text-sm font-semibold text-slate-600">فیلتر:</span>

        <select
          value={statusFilter}
          onChange={e => setFilter('status', e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400"
        >
          <option value="all">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
        </select>

        {distinctCourses.length > 0 && (
          <select
            value={courseFilter}
            onChange={e => setFilter('course', e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">همه دوره‌ها</option>
            {distinctCourses.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        <span className="mr-auto text-xs text-slate-400">{visible.length} کامنت</span>
      </div>

      {/* ── Table ──────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          هیچ کامنتی با این فیلتر وجود ندارد.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                {['نام / ایمیل', 'محتوا', 'مکان', 'تاریخ', 'وضعیت', 'عملیات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right font-semibold text-slate-600 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row, i) => {
                const st = STATUS_META[row.status] ?? STATUS_META.pending;
                const isReplying = replyingTo === row.id;
                const isReply = !!row.parent_id;

                return (
                  <>
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{ backgroundColor: isReply ? '#f0f9ff' : i % 2 === 0 ? 'white' : '#fafafa' }}
                    >
                      {/* User */}
                      <td className="px-4 py-3 min-w-[140px]">
                        {isReply && (
                          <span className="text-xs text-indigo-400 mb-0.5 block">↩ پاسخ ادمین</span>
                        )}
                        <p className="font-medium text-slate-700">
                          {row.profile?.display_name ?? <span className="text-slate-400 italic text-xs">کاربر ناشناس</span>}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {row.profile?.email ?? row.user_id.slice(0, 12) + '…'}
                        </p>
                      </td>

                      {/* Content */}
                      <td className="px-4 py-3 text-slate-600 max-w-[240px]">
                        <p className="line-clamp-2 leading-relaxed">{row.content}</p>
                        {row.is_public_consent && (
                          <span className="inline-block mt-1 text-xs text-indigo-400">عمومی</span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 min-w-[130px]">
                        {row.course_id ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-medium text-slate-600 truncate max-w-[120px]" title={row.course_id}>
                              {row.course_id}
                            </p>
                            {row.lesson_id && (
                              <p className="text-xs text-slate-400 truncate max-w-[120px]" title={row.lesson_id}>
                                {row.lesson_id}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-300 font-mono truncate max-w-[120px] block" title={row.topic_id}>
                            {row.topic_id.slice(0, 14)}…
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                        {new Date(row.created_at).toLocaleDateString('fa-IR', {
                          month: 'short', day: 'numeric',
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {row.status !== 'approved' && (
                            <button
                              onClick={() => handleApprove(row.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: '#16a34a' }}
                            >
                              <CheckCircle size={11} /> تأیید
                            </button>
                          )}
                          {row.status !== 'rejected' && (
                            <button
                              onClick={() => handleReject(row.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: '#dc2626' }}
                            >
                              <XCircle size={11} /> رد
                            </button>
                          )}
                          {!isReply && (
                            <button
                              onClick={() => handleReply(row.id)}
                              disabled={isPending}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                              style={{ backgroundColor: isReplying ? '#6366f1' : '#8b5cf6' }}
                            >
                              <MessageSquarePlus size={11} /> پاسخ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Inline reply box */}
                    {isReplying && (
                      <tr key={`reply-${row.id}`} className="border-t border-indigo-100 bg-indigo-50/50">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="flex items-end gap-3">
                            <div className="flex-1 rounded-2xl border border-indigo-200 bg-white overflow-hidden focus-within:border-indigo-400 transition-colors">
                              <textarea
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="پاسخ ادمین را بنویسید... (ارسال پاسخ، کامنت اصلی را هم تأیید می‌کند)"
                                rows={2}
                                className="w-full px-4 py-2.5 text-sm text-slate-700 bg-transparent outline-none resize-none"
                                style={{ direction: 'rtl' }}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(row);
                                }}
                                autoFocus
                              />
                            </div>
                            <button
                              onClick={() => submitReply(row)}
                              disabled={!replyText.trim() || isPending}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                              style={{ backgroundColor: '#6366f1' }}
                            >
                              <Send size={14} />
                              {isPending ? '...' : 'ارسال'}
                            </button>
                            <button
                              onClick={() => setReplyingTo(null)}
                              className="text-xs text-slate-400 hover:text-slate-600 px-2"
                            >
                              لغو
                            </button>
                          </div>
                          <p className="text-xs text-indigo-400 mt-1.5 pr-1">
                            ⌘+Enter برای ارسال سریع · ارسال پاسخ، کامنت اصلی را نیز تأیید می‌کند
                          </p>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
