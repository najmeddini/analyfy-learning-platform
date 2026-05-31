'use client';

import { useEffect, useState } from 'react';
import type { Project } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/projects')
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted-foreground)' }}>
        پروژه‌ای برای بررسی وجود ندارد
      </p>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: 'var(--color-muted)' }}>
            <th className="text-right px-4 py-3 font-semibold">کاربر</th>
            <th className="text-right px-4 py-3 font-semibold">تاریخ</th>
            <th className="text-right px-4 py-3 font-semibold">وضعیت</th>
            <th className="text-right px-4 py-3 font-semibold">فایل</th>
            <th className="text-right px-4 py-3 font-semibold">عملیات</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {projects.map((project) => (
            <tr key={project.id} className="hover:bg-[var(--color-muted)] transition-colors">
              <td className="px-4 py-3">
                {project.profiles?.display_name ?? project.user_id.slice(0, 8)}
              </td>
              <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatDate(project.created_at)}
              </td>
              <td className="px-4 py-3">
                <span
                  className="text-xs font-medium px-2 py-1 rounded-full"
                  style={{
                    backgroundColor:
                      project.status === 'approved'
                        ? '#22c55e18'
                        : project.status === 'rejected'
                        ? '#ef444418'
                        : '#f59e0b18',
                    color:
                      project.status === 'approved'
                        ? '#16a34a'
                        : project.status === 'rejected'
                        ? '#dc2626'
                        : '#d97706',
                  }}
                >
                  {project.status === 'pending'
                    ? 'در انتظار'
                    : project.status === 'approved'
                    ? 'قبول شده'
                    : 'رد شده'}
                </span>
              </td>
              <td className="px-4 py-3">
                <a
                  href={project.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs hover:underline"
                  style={{ color: '#6c63ff' }}
                >
                  <ExternalLink size={12} />
                  دانلود
                </a>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => updateStatus(project.id, 'approved')}
                    disabled={project.status === 'approved'}
                    className="p-1.5 rounded-lg border transition-colors disabled:opacity-40"
                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                    title="قبول"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <button
                    onClick={() => updateStatus(project.id, 'rejected')}
                    disabled={project.status === 'rejected'}
                    className="p-1.5 rounded-lg border transition-colors disabled:opacity-40"
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                    title="رد"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
