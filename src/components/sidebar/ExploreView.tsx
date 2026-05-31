'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Course } from '@/types';
import { BookOpen, ChevronLeft } from 'lucide-react';

export default function ExploreView() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notion/courses')
      .then((r) => r.json())
      .then((data) => setCourses(data.courses ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <SidebarSkeleton rows={4} />;

  if (courses.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        هنوز دوره‌ای منتشر نشده
      </div>
    );
  }

  return (
    <ul className="divide-y" style={{ '--tw-divide-opacity': 1 } as React.CSSProperties}>
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={`/explore/${course.id}`}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--color-muted)] transition-colors"
          >
            {course.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.cover_image}
                alt={course.title}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#6c63ff22' }}>
                <BookOpen size={14} style={{ color: '#6c63ff' }} />
              </div>
            )}
            <span className="flex-1 font-medium">{course.title}</span>
            <ChevronLeft size={14} style={{ color: 'var(--color-muted-foreground)' }} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SidebarSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="p-2 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
          <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: 'var(--color-muted)' }} />
          <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }} />
        </li>
      ))}
    </ul>
  );
}
