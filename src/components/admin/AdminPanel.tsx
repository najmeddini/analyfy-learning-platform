'use client';

import { useState } from 'react';
import CommentsTab from './CommentsTab';
import ProjectsTab from './ProjectsTab';

type AdminTab = 'comments' | 'projects';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>('comments');

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'comments', label: 'نظرات' },
    { id: 'projects', label: 'پروژه‌ها' },
  ];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">پنل مدیریت</h1>
          <span
            className="text-xs px-2 py-1 rounded-full font-medium"
            style={{ backgroundColor: '#6c63ff18', color: '#6c63ff' }}
          >
            ادمین
          </span>
          <a
            href="/admin/comments"
            className="mr-auto text-xs px-3 py-1.5 rounded-xl text-white font-bold hover:opacity-90"
            style={{ backgroundColor: '#6c63ff' }}
          >
            مدیریت کامنت‌ها ←
          </a>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 p-1 rounded-2xl w-fit"
          style={{ backgroundColor: 'var(--color-muted)' }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{
                backgroundColor: activeTab === tab.id ? 'var(--color-chat-bg)' : 'transparent',
                color: activeTab === tab.id ? 'var(--foreground)' : 'var(--color-muted-foreground)',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'comments' && <CommentsTab />}
        {activeTab === 'projects' && <ProjectsTab />}
      </div>
    </div>
  );
}
