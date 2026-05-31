'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { Award, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface CompletedCourse {
  courseId: string;
  courseTitle: string;
  completedAt: string;
}

export default function CertificateView({
  userId,
  profile,
}: {
  userId: string;
  profile: Profile | null;
}) {
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetch(`/api/certificates?userId=${userId}`)
      .then((r) => r.json())
      .then((data) => setCompletedCourses(data.completedCourses ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--color-muted)' }} />
      </div>
    );
  }

  if (completedCourses.length === 0) {
    return (
      <div className="p-4 text-center space-y-2">
        <Award size={28} className="mx-auto" style={{ color: 'var(--color-muted-foreground)' }} />
        <p className="text-sm font-medium">هنوز دوره‌ای تکمیل نشده</p>
        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          با تکمیل یک دوره کامل، گواهینامه دریافت کنید
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {completedCourses.map((course) => (
        <li key={course.courseId} className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Award size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#f59e0b' }} />
            <div>
              <p className="text-sm font-medium">{course.courseTitle}</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                تکمیل: {formatDate(course.completedAt)}
              </p>
            </div>
          </div>
          <button
            onClick={() => window.open(`/certificate/${course.courseId}?userId=${userId}`, '_blank')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium border transition-colors hover:bg-[var(--color-muted)]"
            style={{ borderColor: 'var(--color-border)' }}
          >
            <Download size={12} />
            دانلود گواهینامه
          </button>
        </li>
      ))}
    </ul>
  );
}
