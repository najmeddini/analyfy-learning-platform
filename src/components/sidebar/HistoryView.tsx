'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface HistoryItem {
  lesson_id: string;
  topic_id: string;
  completed_at: string;
  lesson_title?: string;
}

export default function HistoryView({ userId }: { userId: string }) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('user_progress')
      .select('lesson_id, topic_id, completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setHistory(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-xl" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        هنوز درسی تکمیل نشده
      </div>
    );
  }

  return (
    <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
      {history.map((item) => (
        <li key={`${item.lesson_id}-${item.completed_at}`}>
          <Link
            href={`/learn/${item.lesson_id}`}
            className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--color-muted)] transition-colors"
          >
            <CheckCircle size={16} className="flex-shrink-0 text-green-500" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">درس {item.lesson_id.slice(0, 8)}</p>
              <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                {formatDate(item.completed_at)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
