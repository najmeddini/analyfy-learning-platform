import { createServiceClient } from '@/lib/supabase/server';
import { Heart, ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'حامیان',
  description: 'حامیان مالی آکادمی آنالیفای',
};

export const revalidate = 300; // 5-min ISR

interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  created_at: string;
}

export default async function SponsorsPage() {
  const supabase = await createServiceClient();

  const { data: donations } = await supabase
    .from('donations')
    .select('id, donor_name, amount, created_at')
    .order('amount', { ascending: false })
    .limit(50);

  const list: Donation[] = donations ?? [];
  const totalAmount = list.reduce((sum, d) => sum + d.amount, 0);

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto"
            style={{ backgroundColor: '#6c63ff18' }}
          >
            <Heart size={28} style={{ color: '#6c63ff' }} />
          </div>
          <h1 className="text-2xl font-bold">حامیان آکادمی آنالیفای</h1>
          <p className="text-sm leading-relaxed max-w-sm mx-auto" style={{ color: 'var(--color-muted-foreground)' }}>
            حمایت مالی شما مستقیماً در تولید محتوای آموزشی بیشتر و بهتر تأثیر می‌گذارد
          </p>
        </div>

        {/* CTA — "می‌خواهم حامی باشم" */}
        <div
          className="rounded-3xl p-6 text-center space-y-4"
          style={{ backgroundColor: '#6c63ff10', border: '1px solid #6c63ff30' }}
        >
          <p className="font-bold text-base">می‌خواهید حامی آکادمی باشید؟</p>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            با کمک مالی شما می‌توانیم دوره‌های بیشتری تولید کنیم و آموزش را در دسترس همه قرار دهیم
          </p>
          <a
            href="mailto:support@analyfy.com?subject=می‌خواهم حامی آکادمی آنالیفای باشم"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: '#6c63ff' }}
          >
            <Heart size={16} />
            می‌خواهم حامی باشم
            <ExternalLink size={14} />
          </a>
        </div>

        {/* Stats */}
        {list.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div
              className="rounded-2xl border p-4 text-center"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            >
              <p className="text-2xl font-black">{list.length.toLocaleString('fa-IR')}</p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>حامی</p>
            </div>
            <div
              className="rounded-2xl border p-4 text-center"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            >
              <p className="text-2xl font-black">{totalAmount.toLocaleString('fa-IR')}</p>
              <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>تومان جمع‌آوری‌شده</p>
            </div>
          </div>
        )}

        {/* Scoreboard */}
        {list.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-semibold">برترین حامیان</h2>
            <div
              className="rounded-2xl border overflow-hidden divide-y"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {list.map((d, i) => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-6 text-center text-base flex-shrink-0">
                    {medals[i] ?? (
                      <span className="text-xs font-bold" style={{ color: 'var(--color-muted-foreground)' }}>
                        {(i + 1).toLocaleString('fa-IR')}
                      </span>
                    )}
                  </span>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b45309' : '#6c63ff' }}
                  >
                    {d.donor_name[0]}
                  </div>
                  <span className="flex-1 font-medium text-sm truncate">{d.donor_name}</span>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: '#6c63ff' }}>
                    {d.amount.toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {list.length === 0 && (
          <div className="text-center py-10" style={{ color: 'var(--color-muted-foreground)' }}>
            اولین حامی آکادمی آنالیفای باشید!
          </div>
        )}
      </div>
    </div>
  );
}
