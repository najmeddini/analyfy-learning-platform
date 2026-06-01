'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, X, BookOpen, Loader2, LogIn } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface SearchResult {
  id: string;
  title: string;
  topic_id: string;
}

interface Props {
  onClose: () => void;
  user: User | null;
}

export default function SearchModal({ onClose, user }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [startedTopicIds, setStartedTopicIds] = useState<Set<string> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fetch user's started topics on mount (for filtering)
  useEffect(() => {
    if (!user) return;
    fetch('/api/progress')
      .then(r => r.json())
      .then(data => {
        const topicIds = new Set<string>(
          (data.progress ?? []).map((p: { topic_id: string }) => p.topic_id)
        );
        setStartedTopicIds(topicIds);
      })
      .catch(() => setStartedTopicIds(new Set()));
  }, [user]);

  // Close on Escape / keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') setSelectedIdx(i => Math.min(i + 1, results.length - 1));
      if (e.key === 'ArrowUp') setSelectedIdx(i => Math.max(i - 1, 0));
      if (e.key === 'Enter' && results[selectedIdx]) {
        navigateTo(results[selectedIdx]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results, selectedIdx]);

  // Debounced search
  useEffect(() => {
    if (!user) return;
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        let hits: SearchResult[] = data.results ?? [];

        // Filter to lessons in started courses only (if user has any progress)
        if (startedTopicIds && startedTopicIds.size > 0) {
          hits = hits.filter(r => startedTopicIds.has(r.topic_id));
        }

        setResults(hits);
        setSelectedIdx(0);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, startedTopicIds]);

  function navigateTo(result: SearchResult) {
    router.push(`/learn/${result.id}`);
    onClose();
  }

  // ── Backdrop ──────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--background)', borderColor: 'var(--color-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Guest CTA ─────────────────────────────────────────────────── */}
        {!user ? (
          <div className="px-6 py-10 text-center space-y-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#6c63ff18' }}
            >
              <Search size={22} style={{ color: '#6c63ff' }} />
            </div>
            <div>
              <p className="font-semibold text-base">جستجو در درس‌ها</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-muted-foreground)' }}>
                برای جستجو در محتوای دوره‌هایتان ابتدا وارد شوید
              </p>
            </div>
            <Link
              href="/login"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-white text-sm font-bold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#6c63ff' }}
            >
              <LogIn size={15} />
              ورود / ثبت‌نام
            </Link>
            <button
              onClick={onClose}
              className="block mx-auto text-xs mt-2 hover:underline"
              style={{ color: 'var(--color-muted-foreground)' }}
            >
              بستن
            </button>
          </div>
        ) : (
          <>
            {/* ── Search Input ───────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              {loading ? (
                <Loader2 size={18} className="animate-spin flex-shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
              ) : (
                <Search size={18} className="flex-shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
              )}
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="جستجو در درس‌های دوره‌هایت..."
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--foreground)' }}
              />
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              >
                <X size={16} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>

            {/* ── Results ───────────────────────────────────────────────── */}
            {results.length > 0 ? (
              <ul className="max-h-80 overflow-y-auto py-1">
                {results.map((result, idx) => (
                  <li key={result.id}>
                    <button
                      onClick={() => navigateTo(result)}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm transition-colors"
                      style={{
                        backgroundColor: idx === selectedIdx ? 'var(--color-muted)' : 'transparent',
                        color: 'var(--foreground)',
                      }}
                    >
                      <BookOpen size={15} className="flex-shrink-0" style={{ color: '#6c63ff' }} />
                      <span className="flex-1 truncate">{result.title}</span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: '#6c63ff18', color: '#6c63ff' }}
                      >
                        درس
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : query && !loading ? (
              // No results — distinguish between "not in your courses" vs genuinely nothing
              startedTopicIds && startedTopicIds.size === 0 ? (
                <div className="px-4 py-8 text-center space-y-2">
                  <p className="text-sm font-medium">هنوز دوره‌ای شروع نشده</p>
                  <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                    ابتدا یک دوره را شروع کن تا بتوانی درس‌هایش را جستجو کنی
                  </p>
                  <Link
                    href="/explore"
                    onClick={onClose}
                    className="inline-block mt-2 text-xs font-bold hover:underline"
                    style={{ color: '#6c63ff' }}
                  >
                    مشاهده دوره‌ها ←
                  </Link>
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                  نتیجه‌ای در دوره‌های شما یافت نشد
                </div>
              )
            ) : !query ? (
              <div className="px-4 py-6 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
                {startedTopicIds && startedTopicIds.size > 0
                  ? 'عنوان درس یا کلیدواژه را تایپ کنید'
                  : 'ابتدا یک دوره را شروع کن'}
              </div>
            ) : null}

            {/* ── Keyboard hint ─────────────────────────────────────────── */}
            <div
              className="px-4 py-2 border-t flex items-center gap-4 text-xs"
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}
            >
              <span>↑↓ انتخاب</span>
              <span>↵ باز کردن</span>
              <span>Esc بستن</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
