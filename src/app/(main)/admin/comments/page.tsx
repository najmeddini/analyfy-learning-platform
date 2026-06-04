import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import CommentsTable, { type CommentRow } from './CommentsTable';

export const metadata = { title: 'مدیریت کامنت‌ها' };

type Profile = { user_id: string; display_name: string | null; email: string | null; avatar_url: string | null };

export default async function AdminCommentsPage() {
  // ── Auth guard ───────────────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single();
  if (myProfile?.role !== 'admin') redirect('/');

  // ── Pure service-role client — NO cookie context, fully bypasses RLS ──
  // We intentionally use the vanilla @supabase/supabase-js createClient here
  // (not the @supabase/ssr createServerClient). The SSR version passes the
  // logged-in user's session JWT alongside the service-role key; some Supabase
  // configurations honour that session context and restrict rows. The plain
  // client sends ONLY the service-role key and is guaranteed to bypass RLS.
  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // select('*') avoids failures when optional columns (course_id, lesson_id,
  // parent_id from migration 007) haven't been created yet.
  const { data: rawComments, error } = await adminClient
    .from('comments')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Admin comments fetch error:', error.code, error.message, error.details);
  }

  const comments = (rawComments ?? []) as (Omit<CommentRow, 'profile'>)[];

  // ── Fetch profiles (two-query pattern — no direct FK between comments and profiles) ─
  // comments.user_id → auth.users.id ← profiles.user_id: no PostgREST join possible.
  const userIds = [...new Set(comments.map(c => c.user_id))];
  let profileMap: Record<string, Profile> = {};

  if (userIds.length > 0) {
    const { data: profiles, error: profilesError } = await adminClient
      .from('profiles').select('user_id, display_name, email, avatar_url').in('user_id', userIds);
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

  // Distinct course/lesson ids for filter dropdowns (exclude nulls)
  const distinctCourses = [...new Set(
    rows.map(r => r.course_id).filter((c): c is string => !!c)
  )];
  const distinctLessons = [...new Set(
    rows.map(r => r.lesson_id).filter((l): l is string => !!l)
  )];

  return (
    <div dir="rtl" className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: 'var(--color-chat-bg)' }}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-800">پرسش و پاسخ‌ها</h1>
            <p className="text-sm text-slate-500 mt-1">
              بررسی، تأیید و پاسخ به سوالات دانشجویان
              <span className="mr-2 text-indigo-500 font-semibold">({comments.length} مورد در دیتابیس)</span>
            </p>
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
        <CommentsTable rows={rows} distinctCourses={distinctCourses} distinctLessons={distinctLessons} />
      </div>
    </div>
  );
}
