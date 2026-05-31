'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, BookOpen, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string;
  title: string;
  topic_id: string;
}

interface Props {
  onClose: () => void;
}

export default function SearchModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
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
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setSelectedIdx(0);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  function navigateTo(result: SearchResult) {
    router.push(`/learn/${result.id}`);
    onClose();
  }

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
        {/* Input */}
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
            placeholder="جستجو در دوره‌ها و درس‌ها..."
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

        {/* Results */}
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
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#6c63ff18', color: '#6c63ff' }}>
                    درس
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : query && !loading ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            نتیجه‌ای یافت نشد
          </div>
        ) : !query ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            عنوان درس یا کلیدواژه را تایپ کنید
          </div>
        ) : null}

        {/* Keyboard hint */}
        <div className="px-4 py-2 border-t flex items-center gap-4 text-xs" style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)' }}>
          <span>↑↓ انتخاب</span>
          <span>↵ باز کردن</span>
          <span>Esc بستن</span>
        </div>
      </div>
    </div>
  );
}
