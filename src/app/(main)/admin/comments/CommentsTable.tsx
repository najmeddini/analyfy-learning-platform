'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CheckCircle, XCircle, Clock, MessageSquarePlus, Send,
  Search, CheckSquare, Square,
} from 'lucide-react';
import { approveComment, rejectComment, replyAndApprove, bulkApproveComments } from './actions';

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
  distinctLessons: string[];
}

export default function CommentsTable({ rows, distinctCourses, distinctLessons }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [replyingTo, setReplyingTo]   = useState<string | null>(null);
  const [replyText,  setReplyText]    = useState('');
  const [isPending,  startTransition] = useTransition();

  // ── Local-state filters ───────────────────────────────────────
  const [searchText, setSearchText] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── URL-based filters ─────────────────────────────────────────
  const statusFilter  = searchParams.get('status')  ?? 'all';
  const courseFilter  = searchParams.get('course')  ?? 'all';
  const lessonFilter  = searchParams.get('lesson')  ?? 'all';
  const privacyFilter = searchParams.get('privacy') ?? 'all';
  const threadFilter  = searchParams.get('thread')  ?? 'all';

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key); else params.set(key, value);
    router.push(`/admin/comments?${params.toString()}`);
  }

  function clearAllFilters() {
    router.push('/admin/comments');
    setSearchText('');
  }

  const hasActiveFilters =
    statusFilter !== 'all' || courseFilter !== 'all' || lessonFilter !== 'all' ||
    privacyFilter !== 'all' || threadFilter !== 'all' || searchText.trim() !== '';

  // ── Apply all filters ─────────────────────────────────────────
  const visible = rows.filter(r => {
    if (statusFilter  !== 'all' && r.status     !== statusFilter)  return false;
    if (courseFilter  !== 'all' && r.course_id  !== courseFilter)  return false;
    if (lessonFilter  !== 'all' && r.lesson_id  !== lessonFilter)  return false;
    if (privacyFilter === 'public'  && !r.is_public_consent)       return false;
    if (privacyFilter === 'private' &&  r.is_public_consent)       return false;
    if (threadFilter  === 'top-level' && r.parent_id !== null)     return false;
    if (threadFilter  === 'replies'   && r.parent_id === null)     return false;
    if (searchText.trim() && !r.content.toLowerCase().includes(searchText.trim().toLowerCase())) return false;
    return true;
  });

  const counts = {
    pending:  rows.filter(r => r.status === 'pending').length,
    approved: rows.filter(r => r.status === 'approved').length,
    rejected: rows.filter(r => r.status === 'rejected').length,
  };

  // ── Bulk select helpers ───────────────────────────────────────
  const allVisibleSelected = visible.length > 0 && visible.every(r => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map(r => r.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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

  function handleBulkApprove() {
    if (!someSelected) return;
    const ids = Array.from(selectedIds);
    startTransition(async () => {
      await bulkApproveComments(ids);
      setSelectedIds(new Set());
    });
  }

  return (
    <div className="space-y-5" dir="rtl">
      {/* ── Stats cards ────────────────────────────────────────── */}
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

      {/* ── Filters bar ────────────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3">
        {/* Row 1: text search */}
        <div className="relative">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="جستجو در متن پرسش‌ها..."
            className="w-full text-sm border border-slate-200 rounded-xl pr-9 pl-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-400 transition-colors"
            style={{ direction: 'rtl' }}
          />
        </div>

        {/* Row 2: dropdown filters */}
        <div className="flex flex-wrap items-center gap-3">
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

          {distinctLessons.length > 0 && (
            <select
              value={lessonFilter}
              onChange={e => setFilter('lesson', e.target.value)}
              className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400 max-w-[200px]"
            >
              <option value="all">همه درس‌ها</option>
              {distinctLessons.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          )}

          <select
            value={privacyFilter}
            onChange={e => setFilter('privacy', e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">عمومی + خصوصی</option>
            <option value="public">فقط عمومی</option>
            <option value="private">فقط خصوصی</option>
          </select>

          <select
            value={threadFilter}
            onChange={e => setFilter('thread', e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-700 outline-none focus:border-indigo-400"
          >
            <option value="all">سوال + پاسخ</option>
            <option value="top-level">فقط سوال‌ها</option>
            <option value="replies">فقط پاسخ‌ها</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              پاک‌کردن همه فیلترها
            </button>
          )}

          <span className="mr-auto text-xs text-slate-400">{visible.length} مورد</span>
        </div>
      </div>

      {/* ── Bulk action toolbar (appears when rows selected) ───── */}
      {someSelected && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
          style={{ backgroundColor: '#eef2ff', borderColor: '#c7d2fe' }}
        >
          <span className="text-sm font-semibold text-indigo-700">
            {selectedIds.size} مورد انتخاب شده
          </span>
          <button
            onClick={handleBulkApprove}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#16a34a' }}
          >
            <CheckCircle size={14} />
            {isPending ? 'در حال تأیید...' : 'تأیید دسته‌جمعی'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-indigo-500 hover:text-indigo-700 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            لغو انتخاب
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      {visible.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
          هیچ موردی با این فیلتر وجود ندارد.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--color-muted)' }}>
                {/* Checkbox header */}
                <th className="px-3 py-3 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center w-full"
                    title={allVisibleSelected ? 'لغو انتخاب همه' : 'انتخاب همه'}
                  >
                    {allVisibleSelected
                      ? <CheckSquare size={16} className="text-indigo-500" />
                      : <Square size={16} className="text-slate-400" />
                    }
                  </button>
                </th>
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
                const isSelected = selectedIds.has(row.id);

                return (
                  <>
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{
                        backgroundColor: isSelected
                          ? '#eef2ff'
                          : isReply
                            ? '#f0f9ff'
                            : i % 2 === 0 ? 'white' : '#fafafa',
                      }}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 w-10">
                        <button
                          onClick={() => toggleSelect(row.id)}
                          className="flex items-center justify-center w-full"
                        >
                          {isSelected
                            ? <CheckSquare size={15} className="text-indigo-500" />
                            : <Square size={15} className="text-slate-300 hover:text-slate-400" />
                          }
                        </button>
                      </td>

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
                        <td colSpan={7} className="px-6 py-3">
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
