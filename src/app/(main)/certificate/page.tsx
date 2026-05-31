import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { Award, Download } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'گواهینامه‌ها',
  description: 'گواهینامه‌های دوره‌های تکمیل‌شده شما',
};

export const revalidate = 0;

interface CompletedCourse {
  courseId: string;
  courseTitle: string;
  completedAt: string;
}

export default async function CertificatePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = (await supabase
    .from('profiles')
    .select('display_name, org_id')
    .eq('user_id', user.id)
    .single()
  ).data;

  // Fetch from certificates API
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL}/api/certificates?userId=${user.id}`,
    { cache: 'no-store' }
  );
  const data = res.ok ? await res.json() : { completedCourses: [] };
  const completedCourses: CompletedCourse[] = data.completedCourses ?? [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">گواهینامه‌ها</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            با تکمیل کامل یک دوره، گواهینامه دریافت کنید
          </p>
        </div>

        {completedCourses.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#f59e0b18' }}
            >
              <Award size={32} style={{ color: '#d97706' }} />
            </div>
            <p className="font-medium">هنوز دوره‌ای تکمیل نشده</p>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              یک دوره را تا انتها بخوانید تا گواهینامه بگیرید
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {completedCourses.map((course) => (
              <div
                key={course.courseId}
                className="rounded-2xl border overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}
              >
                {/* Certificate preview */}
                <div
                  className="px-6 py-6 flex flex-col items-center text-center space-y-3"
                  style={{ backgroundColor: '#f59e0b08', borderBottom: '1px solid var(--color-border)' }}
                >
                  <Award size={40} style={{ color: '#d97706' }} />
                  <div>
                    <p className="font-black text-lg">گواهینامه تکمیل دوره</p>
                    <p className="text-xl font-bold mt-1" style={{ color: '#6c63ff' }}>{course.courseTitle}</p>
                    {profile?.display_name && (
                      <p className="text-sm mt-2" style={{ color: 'var(--color-muted-foreground)' }}>
                        اعطا شده به: <strong>{profile.display_name}</strong>
                      </p>
                    )}
                    <p className="text-xs mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                      تاریخ تکمیل: {formatDate(course.completedAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-4 py-3 flex items-center justify-end">
                  <button
                    onClick={() =>
                      window.open(`/certificate/${course.courseId}?userId=${user.id}`, '_blank')
                    }
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors hover:bg-[var(--color-muted)]"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    <Download size={14} />
                    دانلود گواهینامه
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
