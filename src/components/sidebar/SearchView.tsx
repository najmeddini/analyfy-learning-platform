'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Search } from 'lucide-react';

interface SearchResult {
  lesson_id: string;
  topic_id: string;
  completed_at: string;
}

export default function SearchView({ userId }: { userId: string }) {
  const [query, setQuery] = useState('');
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('user_progress')
      .select('lesson_id')
      .eq('user_id', userId)
      .then(({ data }) => setCompletedIds(data?.map((d) => d.lesson_id) ?? []));
  }, [userId]);

  return (
    <div className="p-3 space-y-3">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-xl border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
      >
        <Search size={14} style={{ color: 'var(--color-muted-foreground)' }} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جستجو در دروس تکمیل‌شده..."
          className="flex-1 bg-transparent text-sm outline-none text-right"
          style={{ color: 'var(--foreground)' }}
        />
      </div>

      <p className="text-xs text-center" style={{ color: 'var(--color-muted-foreground)' }}>
        جستجو فقط در {completedIds.length} درس تکمیل‌شده شما
      </p>

      {query.length > 0 && completedIds.length === 0 && (
        <p className="text-xs text-center" style={{ color: 'var(--color-muted-foreground)' }}>
          ابتدا یک درس را تکمیل کنید
        </p>
      )}
    </div>
  );
}
