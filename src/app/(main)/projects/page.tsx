'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { NotionProject, Course } from '@/types';
import FileUploadWidget from '@/components/chat/FileUploadWidget';
import BountyBadge from '@/components/ui/BountyBadge';
import { FolderOpen, BookOpen, ChevronLeft, ArrowRight } from 'lucide-react';

interface CourseWithProjects {
  course: Course;
  projects: NotionProject[];
}

export default function ProjectsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selected, setSelected] = useState<CourseWithProjects | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [uploadedIds, setUploadedIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  // Load courses user has started (has any progress)
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingCourses(false); return; }

      const [{ data: progress }, coursesRes] = await Promise.all([
        supabase.from('user_progress').select('topic_id').eq('user_id', user.id),
        fetch('/api/notion/courses').then(r => r.json()),
      ]);

      const startedTopicIds = new Set((progress ?? []).map((p: { topic_id: string }) => p.topic_id));
      const allCourses: Course[] = coursesRes.courses ?? [];

      // For now show all courses (projects are per course, not per topic)
      setCourses(allCourses.filter(c => c.access_type !== 'Draft'));
      setLoadingCourses(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load projects when a course is selected
  async function selectCourse(course: Course) {
    setLoadingProjects(true);
    const res = await fetch(`/api/notion/projects?courseId=${course.id}`);
    const data = await res.json();
    setSelected({ course, projects: data.projects ?? [] });
    setLoadingProjects(false);
  }

  async function handleUpload(projectId: string, topicId: string, file: File, isBounty: boolean, maxMb: number, extensions: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const form = new FormData();
    form.append('file', file);
    form.append('topic_id', topicId);
    form.append('project_id', projectId);
    form.append('max_size_mb', String(maxMb));
    form.append('allowed_extensions', extensions);
    if (isBounty) form.append('is_bounty_submission', 'true');
    const res = await fetch('/api/projects', { method: 'POST', body: form });
    if (res.ok) setUploadedIds(prev => new Set([...prev, projectId]));
  }

  if (loadingCourses) {
    return (
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  // Project detail view
  if (selected) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
          <button
            onClick={() => setSelected(null)}
            className="text-sm flex items-center gap-1 hover:underline"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <ArrowRight size={14} />
            بازگشت به دوره‌ها
          </button>

          <h1 className="text-xl font-bold">{selected.course.title}</h1>

          {loadingProjects ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-muted)' }} />
              ))}
            </div>
          ) : selected.projects.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FolderOpen size={40} className="mx-auto opacity-30" />
              <p style={{ color: 'var(--color-muted-foreground)' }}>پروژه‌ای برای این دوره تعریف نشده</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selected.projects.map((project) => {
                const isDone = uploadedIds.has(project.id);
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border overflow-hidden"
                    style={{ borderColor: 'var(--color-border)' }}
                  >
                    {/* Project header */}
                    <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold">{project.title}</p>
                          {project.is_bounty && (
                            <div className="mt-2">
                              <BountyBadge
                                prize={project.bounty_prize}
                                sponsorName={project.bounty_sponsor_name}
                                sponsorLogo={null}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                        {isDone && (
                          <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e18', color: '#16a34a' }}>
                            ✅ ارسال شد
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Instructions */}
                    {project.html_content && (
                      <div
                        className="lesson-content px-4 py-4 text-sm border-b"
                        style={{ borderColor: 'var(--color-border)' }}
                        dangerouslySetInnerHTML={{ __html: project.html_content }}
                      />
                    )}

                    {/* Upload */}
                    {!isDone && (
                      <div className="px-4 py-4">
                        <p className="text-xs font-medium mb-3" style={{ color: 'var(--color-muted-foreground)' }}>
                          فرمت‌های مجاز: {project.allowed_extensions || 'همه'} — حداکثر: {project.project_max_size_mb} مگابایت
                        </p>
                        <FileUploadWidget
                          onUpload={(file) =>
                            handleUpload(
                              project.id,
                              selected.course.id, // use course_id as fallback topic_id
                              file,
                              project.is_bounty,
                              project.project_max_size_mb,
                              project.allowed_extensions
                            )
                          }
                          maxSizeMb={project.project_max_size_mb}
                          allowedExtensions={project.allowed_extensions}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Course list view
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">پروژه‌های من</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
            یک دوره انتخاب کنید تا پروژه‌های آن را مشاهده و ارسال کنید
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <FolderOpen size={40} className="mx-auto opacity-30" />
            <p style={{ color: 'var(--color-muted-foreground)' }}>هنوز دوره‌ای وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course) => (
              <button
                key={course.id}
                onClick={() => selectCourse(course)}
                className="w-full rounded-2xl border flex items-center gap-4 p-4 hover:shadow-md transition-all hover:-translate-y-0.5 text-right"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
              >
                {course.cover_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={course.cover_image} alt={course.title} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6c63ff18' }}>
                    <BookOpen size={20} style={{ color: '#6c63ff' }} />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-right">
                  <p className="font-bold text-sm">{course.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                    مشاهده پروژه‌ها
                  </p>
                </div>
                <ChevronLeft size={18} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
