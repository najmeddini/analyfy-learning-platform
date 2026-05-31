'use client';

import { useEffect, useState } from 'react';
import type { Comment } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function CommentsTab() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/comments')
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/comments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
  }

  async function deleteComment(id: string) {
    await fetch(`/api/admin/comments/${id}`, { method: 'DELETE' });
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="text-sm text-center py-8" style={{ color: 'var(--color-muted-foreground)' }}>
        نظری برای بررسی وجود ندارد
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="rounded-2xl border p-4 space-y-3"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <p className="text-sm leading-relaxed">{comment.content}</p>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <span>{formatDate(comment.created_at)}</span>
                <span>•</span>
                <span>
                  {comment.is_public_consent ? '✅ اجازه نمایش عمومی' : '🔒 خصوصی'}
                </span>
                <span>•</span>
                <span
                  className="font-medium"
                  style={{
                    color: comment.status === 'approved' ? '#22c55e' : comment.status === 'rejected' ? '#ef4444' : '#f59e0b',
                  }}
                >
                  {comment.status === 'pending' ? 'در انتظار' : comment.status === 'approved' ? 'تأیید شده' : 'رد شده'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => updateStatus(comment.id, 'approved')}
              disabled={comment.status === 'approved'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40"
              style={{ borderColor: '#22c55e', color: '#22c55e' }}
            >
              <CheckCircle size={12} />
              تأیید
            </button>
            <button
              onClick={() => updateStatus(comment.id, 'rejected')}
              disabled={comment.status === 'rejected'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors disabled:opacity-40"
              style={{ borderColor: '#ef4444', color: '#ef4444' }}
            >
              <XCircle size={12} />
              رد
            </button>
            <button
              onClick={() => deleteComment(comment.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors mr-auto"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
            >
              <Trash2 size={12} />
              حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
