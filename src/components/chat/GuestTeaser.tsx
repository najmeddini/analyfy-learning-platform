'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Comment } from '@/types';
import { MessageSquare, Lock } from 'lucide-react';

interface Props {
  topicId: string;
}

export default function GuestTeaser({ topicId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/comments?topic_id=${topicId}`)
      .then((r) => r.json())
      .then((d) => {
        const all: Comment[] = d.comments ?? [];
        setTotal(all.length);
        setComments(all.slice(0, 3));
      });
  }, [topicId]);

  return (
    <div
      className="border-t flex-shrink-0"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
    >
      {comments.length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          <p className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--color-muted-foreground)' }}>
            <MessageSquare size={13} />
            پاسخ‌های دیگران
          </p>
          <ul className="space-y-2">
            {comments.map((c) => (
              <li
                key={c.id}
                className="px-3 py-2 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <p className="font-medium text-xs mb-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
                  {c.profiles?.display_name ?? 'دانش‌آموز'}
                </p>
                <p className="line-clamp-2">{c.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA */}
      <div className="px-4 py-4 flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#6c63ff18' }}
        >
          <Lock size={14} style={{ color: '#6c63ff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            {total > 3
              ? `برای مشاهده ${total - 3} پاسخ دیگر وارد شوید`
              : 'وارد شوید تا پیشرفت‌تان ذخیره شود'}
          </p>
          <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
            پاسخ بنویسید، پیشرفت را دنبال کنید
          </p>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 rounded-xl text-white text-xs font-bold flex-shrink-0 hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#6c63ff' }}
        >
          ورود
        </Link>
      </div>
    </div>
  );
}
