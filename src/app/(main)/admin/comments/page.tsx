import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import CommentsTable, { type CommentRow } from './CommentsTable';

export const metadata = { title: 'مدیریت کامنت‌ها' };

type Profile = { user_id: string; display_name: string | null; email: string | null };

export default async function AdminCommentsPage() {
  // ── Auth guard ───────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (myProfile?.role !== 'admin') redirect('/');

  // ── Fetch data (service role bypasses RLS) ───────────────────
  const service = await createServiceClient();

  const { data: rawComments, error } = await service
    .from('comments')
    .select('id, content, status, created_at, topic_id, course_id, lesson_id, user_id, is_public_consent, parent_id')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin comments fetch error:', error.code, error.message, error.details);
  }

  const comments = (rawComments ?? []) as (Omit<CommentRow, 'profile'>)[];

  // ── Fetch profiles (separate query — no direct FK to profiles) ─
  const userIds = [...new Set(comments.map(c => c.user_id))];
  let profileMap: Record<string, Profile> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await service
      .from('profiles').select('user_id, display_name, email').in('user_id', userIds);
    if (profilesError) {
      console.error('Admin profiles fetch error:', profilesError.code, profilesError.message);
    }
    profileMap = Object.fromEntries((profiles ?? []).map((p: Profile) => [p.user_id, p]));
  }

  // ── Merge ─────────────────────────────────────────────────────
  const rows: CommentRow[] = comments.map(c => ({
    ...c,
    profile: profileMap[c.user_id] ?? null,
  }));

  // Distinct course_ids for filter dropdown (exclude nulls)
  const distinctCourses = [...new Set(
    rows.map(r => r.course_id).filter((c): c is string => !!c)
  )];

  return (
    <div dir="rtl" className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-chat-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">مدیریت کامنت‌ها</h1>
            <p className="text-sm text-slate-500 mt-1">بررسی، تأیید و پاسخ به بازتاب‌های یادگیری کاربران</p>
          </div>
          <a href="/admin" className="text-sm text-indigo-600 hover:underline">← پنل ادمین</a>
        </div>

        {/* Inline error banner */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-700 border border-red-200">
            خطا در دریافت داده: {error.message}
          </div>
        )}

        {/* Client component handles filters, table, reply UI */}
        <CommentsTable rows={rows} distinctCourses={distinctCourses} />
      </div>
    </div>
  );
}
