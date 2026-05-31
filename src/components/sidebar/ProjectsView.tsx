'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Project } from '@/types';
import { formatDate } from '@/lib/utils';
import { FolderOpen, Clock, CheckCircle, XCircle } from 'lucide-react';

const statusConfig = {
  pending: { label: 'در انتظار بررسی', icon: <Clock size={14} className="text-yellow-500" />, color: '#f59e0b' },
  approved: { label: 'تأیید شده', icon: <CheckCircle size={14} className="text-green-500" />, color: '#22c55e' },
  rejected: { label: 'رد شده', icon: <XCircle size={14} className="text-red-500" />, color: '#ef4444' },
};

export default function ProjectsView({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProjects(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-xl" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 text-center space-y-2">
        <FolderOpen size={24} className="mx-auto" style={{ color: 'var(--color-muted-foreground)' }} />
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          هنوز پروژه‌ای ارسال نشده
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {projects.map((project) => {
        const s = statusConfig[project.status];
        return (
          <li key={project.id}>
            <div className="px-4 py-3 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {s.icon}
                <span style={{ color: s.color }}>{s.label}</span>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatDate(project.created_at)}
              </p>
              <Link
                href={project.file_url}
                target="_blank"
                className="text-xs underline"
                style={{ color: '#6c63ff' }}
              >
                مشاهده فایل
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
