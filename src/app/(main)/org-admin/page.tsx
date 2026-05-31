import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { Users, BookOpen, TrendingUp, Building2 } from 'lucide-react';
import type { EmployeeProgress } from '@/types';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پنل سازمانی | پلتفرم یادگیری',
  description: 'مدیریت پیشرفت یادگیری اعضای سازمان',
};

export default async function OrgAdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Load the user's profile to get org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id, display_name')
    .eq('user_id', user.id)
    .single();

  if (!profile?.org_id) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <Building2 size={40} className="mx-auto opacity-30" />
          <p className="font-medium">شما به هیچ سازمانی تعلق ندارید</p>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            برای دسترسی به پنل سازمانی باید عضو یک سازمان باشید
          </p>
        </div>
      </div>
    );
  }

  // Verify this user is the org admin
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, logo_url')
    .eq('id', profile.org_id)
    .eq('admin_user_id', user.id)
    .single();

  if (!org) {
    // Authenticated & in org, but not the admin
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="space-y-3">
          <Building2 size={40} className="mx-auto opacity-30" />
          <p className="font-medium">دسترسی محدود</p>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            فقط مدیر سازمان می‌تواند به این پنل دسترسی داشته باشد
          </p>
        </div>
      </div>
    );
  }

  // Fetch all employees in this org
  const { data: members } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url')
    .eq('org_id', org.id);

  // Fetch progress for each member in parallel
  const employeeProgress: EmployeeProgress[] = await Promise.all(
    (members ?? []).map(async (member) => {
      const [{ count }, { data: lastRow }] = await Promise.all([
        supabase
          .from('user_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', member.user_id),
        supabase
          .from('user_progress')
          .select('completed_at')
          .eq('user_id', member.user_id)
          .order('completed_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        user_id: member.user_id,
        display_name: member.display_name,
        avatar_url: member.avatar_url,
        completed_lessons: count ?? 0,
        last_activity: lastRow?.completed_at ?? null,
      };
    })
  );

  // Sort by completed_lessons descending
  employeeProgress.sort((a, b) => b.completed_lessons - a.completed_lessons);

  const totalLessons = employeeProgress.reduce((s, e) => s + e.completed_lessons, 0);
  const activeCount = employeeProgress.filter((e) => e.last_activity).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          {org.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logo_url}
              alt={org.name}
              className="w-12 h-12 rounded-2xl object-contain border"
              style={{ borderColor: 'var(--color-border)' }}
            />
          )}
          <div>
            <h1 className="text-xl font-bold">{org.name}</h1>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              پنل مدیریت سازمانی
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              icon: <Users size={18} style={{ color: '#6c63ff' }} />,
              label: 'تعداد اعضا',
              value: employeeProgress.length,
              bg: '#6c63ff18',
            },
            {
              icon: <BookOpen size={18} style={{ color: '#22c55e' }} />,
              label: 'مجموع درس‌های تکمیل‌شده',
              value: totalLessons,
              bg: '#22c55e18',
            },
            {
              icon: <TrendingUp size={18} style={{ color: '#f59e0b' }} />,
              label: 'اعضای فعال',
              value: activeCount,
              bg: '#f59e0b18',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4 flex items-center gap-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: stat.bg }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-lg font-bold">{stat.value.toLocaleString('fa-IR')}</p>
                <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Employee Table */}
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
            <h2 className="font-semibold text-sm">پیشرفت اعضا</h2>
          </div>

          {employeeProgress.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                هنوز هیچ عضوی در این سازمان وجود ندارد
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {/* Table header */}
              <div
                className="grid grid-cols-4 px-4 py-2 text-xs font-semibold"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                <span className="col-span-2">عضو</span>
                <span className="text-center">درس‌های تکمیل‌شده</span>
                <span className="text-center">آخرین فعالیت</span>
              </div>

              {employeeProgress.map((emp, idx) => (
                <div
                  key={emp.user_id}
                  className="grid grid-cols-4 items-center px-4 py-3 hover:bg-[var(--color-muted)] transition-colors"
                >
                  {/* Employee info */}
                  <div className="col-span-2 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden"
                      style={{ backgroundColor: '#6c63ff18', color: '#6c63ff' }}
                    >
                      {emp.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={emp.avatar_url}
                          alt={emp.display_name ?? ''}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (emp.display_name?.[0] ?? '؟')
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {emp.display_name ?? 'کاربر بدون نام'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        رتبه {(idx + 1).toLocaleString('fa-IR')}
                      </p>
                    </div>
                  </div>

                  {/* Completed count */}
                  <div className="text-center">
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: '#22c55e18', color: '#16a34a' }}
                    >
                      <BookOpen size={11} />
                      {emp.completed_lessons.toLocaleString('fa-IR')}
                    </span>
                  </div>

                  {/* Last activity */}
                  <div className="text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    {emp.last_activity ? formatDate(emp.last_activity) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
