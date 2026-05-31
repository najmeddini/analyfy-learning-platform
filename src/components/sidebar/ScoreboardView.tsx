'use client';

import { useEffect, useState } from 'react';
import type { Donation } from '@/types';
import { Gift } from 'lucide-react';

export default function ScoreboardView() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/donations/scoreboard')
      .then((r) => r.json())
      .then((data) => setDonations(data.donations ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4 space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3 items-center">
            <div className="w-6 h-4 rounded" style={{ backgroundColor: 'var(--color-muted)' }} />
            <div className="flex-1 h-4 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }} />
            <div className="w-12 h-4 rounded-full" style={{ backgroundColor: 'var(--color-muted)' }} />
          </div>
        ))}
      </div>
    );
  }

  if (donations.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
        هنوز حامیان ثبت نشده‌اند
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <Gift size={14} style={{ color: '#6c63ff' }} />
        <span className="text-xs font-semibold" style={{ color: 'var(--color-muted-foreground)' }}>
          برترین حامیان
        </span>
      </div>
      <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
        {donations.slice(0, 10).map((d, i) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="text-base w-5 text-center flex-shrink-0">
              {medals[i] ?? <span className="text-xs font-bold" style={{ color: 'var(--color-muted-foreground)' }}>{i + 1}</span>}
            </span>
            <span className="flex-1 text-sm font-medium truncate">{d.donor_name}</span>
            <span className="text-xs font-bold" style={{ color: '#6c63ff' }}>
              {d.amount.toLocaleString('fa-IR')} تومان
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
