'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageCircle, LogIn } from 'lucide-react';

interface GuestComment {
  id: string;
  content: string;
  display_name: string | null;
  created_at: string;
}

interface Props {
  topicId: string;
}

export default function GuestTeaser({ topicId }: Props) {
  const [recent, setRecent] = useState<GuestComment[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch(`/api/comments?topic_id=${encodeURIComponent(topicId)}`)
      .then(r => r.json())
      .then(d => {
        const all: GuestComment[] = d.comments ?? [];
        setTotal(all.length);
        // Show the 3 most recent (API returns ascending; take last 3)
        setRecent(all.slice(-3));
      });
  }, [topicId]);

  return (
    <div
      className="border-t flex-shrink-0"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
      dir="rtl"
    >
      {/* 3 most-recent approved public Q&As */}
      {recent.length > 0 && (
        <div className="px-4 pt-4 space-y-3">
          <p
            className="text-xs font-semibold flex items-center gap-1.5"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            <MessageCircle size={13} />
            پرسش و پاسخ دانشجویان
          </p>
          <ul className="space-y-2">
            {recent.map(c => (
              <li
                key={c.id}
                className="px-3 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--color-muted)' }}
              >
                <p className="font-semibold text-xs mb-0.5" style={{ color: '#6c63ff' }}>
                  {c.display_name ?? 'دانشجو'}
                </p>
                <p className="line-clamp-2 leading-relaxed">{c.content}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* CTA box */}
      <div
        className="mx-4 my-4 rounded-2xl px-4 py-4 flex items-center gap-3"
        style={{ backgroundColor: '#6c63ff10', border: '1px solid #6c63ff30' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#6c63ff20' }}
        >
          <LogIn size={16} style={{ color: '#6c63ff' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug">
            برای مشاهده تمام پرسش و پاسخ‌ها و ثبت سوال خود، وارد شوید
          </p>
          {total > 3 && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-muted-foreground)' }}>
              {total} پرسش و پاسخ در این درس
            </p>
          )}
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
