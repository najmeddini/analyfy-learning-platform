import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getCourses } from '@/lib/notion/client';
import { formatDate } from '@/lib/utils';
import { Award, ExternalLink, Globe, BookOpen, FolderOpen } from 'lucide-react';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, bio')
    .eq('username', username)
    .single();

  if (!profile) return { title: 'کاربر یافت نشد' };
  return {
    title: profile.display_name ?? username,
    description: profile.bio ?? `پروفایل عمومی ${username}`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createServiceClient();

  // Load profile by username
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, bio, linkedin_url, website_url, expertise, created_at, org_id')
    .eq('username', username)
    .single();

  if (!profile) notFound();

  // Completed lessons → derive course IDs
  const { data: progress } = await supabase
    .from('user_progress')
    .select('topic_id, lesson_id, lesson_title, completed_at')
    .eq('user_id', profile.user_id)
    .order('completed_at', { ascending: false });

  const completedTopicIds = new Set((progress ?? []).map(p => p.topic_id));

  // Get courses to find completed ones
  const courses = await getCourses();

  // Approved projects
  const { data: projects } = await supabase
    .from('projects')
    .select('id, topic_id, status, created_at')
    .eq('user_id', profile.user_id)
    .eq('status', 'approved');

  // Org name
  let orgName: string | null = null;
  if (profile.org_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, logo_url')
      .eq('id', profile.org_id)
      .single();
    orgName = org?.name ?? null;
  }

  const completedLessonsCount = (progress ?? []).length;
  const approvedProjectsCount = (projects ?? []).length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Profile header */}
        <div className="flex items-start gap-5">
          <div
            className="w-20 h-20 rounded-3xl overflow-hidden flex items-center justify-center text-2xl font-black text-white flex-shrink-0"
            style={{ backgroundColor: '#6c63ff' }}
          >
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name ?? username} className="w-full h-full object-cover" />
            ) : (
              (profile.display_name?.[0] ?? username[0]).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div>
              <h1 className="text-xl font-bold">{profile.display_name ?? username}</h1>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>@{username}</p>
            </div>
            {profile.expertise && (
              <p className="text-sm font-medium" style={{ color: '#6c63ff' }}>{profile.expertise}</p>
            )}
            {profile.bio && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
                {profile.bio}
              </p>
            )}
            {/* Social links */}
            <div className="flex items-center gap-3">
              {profile.linkedin_url && (
                <a
                  href={profile.linkedin_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: '#0077b5' }}
                >
                  <ExternalLink size={14} />
                  LinkedIn
                </a>
              )}
              {profile.website_url && (
                <a
                  href={profile.website_url}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="flex items-center gap-1 text-xs hover:underline"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  <Globe size={14} />
                  وب‌سایت
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'درس تکمیل‌شده', value: completedLessonsCount, icon: <BookOpen size={16} style={{ color: '#6c63ff' }} /> },
            { label: 'پروژه تأیید شده', value: approvedProjectsCount, icon: <FolderOpen size={16} style={{ color: '#22c55e' }} /> },
            { label: 'عضو از', value: formatDate(profile.created_at), small: true, icon: <Award size={16} style={{ color: '#f59e0b' }} /> },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border p-3 text-center space-y-1"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            >
              <div className="flex justify-center">{stat.icon}</div>
              <p className={`font-bold ${stat.small ? 'text-xs' : 'text-lg'}`}>
                {typeof stat.value === 'number' ? stat.value.toLocaleString('fa-IR') : stat.value}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Organization */}
        {orgName && (
          <div
            className="rounded-2xl border px-4 py-3 flex items-center gap-3"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: '#6c63ff' }}>
              {orgName[0]}
            </div>
            <p className="text-sm font-medium">{orgName}</p>
          </div>
        )}

        {/* Completed courses */}
        {courses.length > 0 && completedTopicIds.size > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">دوره‌های آموزشی</h2>
            <div className="space-y-2">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-2xl border flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
                >
                  <BookOpen size={16} style={{ color: '#6c63ff' }} className="flex-shrink-0" />
                  <span className="text-sm font-medium">{course.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Approved projects */}
        {approvedProjectsCount > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">پروژه‌های تأیید شده</h2>
            <div className="space-y-2">
              {(projects ?? []).map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border flex items-center gap-3 px-4 py-3"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
                >
                  <FolderOpen size={16} style={{ color: '#22c55e' }} className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">پروژه</p>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                      {formatDate(project.created_at)}
                    </p>
                  </div>
                  {/* No file URL exposed */}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
