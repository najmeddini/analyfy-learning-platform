import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import { ArrowLeft } from 'lucide-react';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      dir="rtl"
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'Vazirmatn', sans-serif", backgroundColor: 'var(--color-chat-bg)' }}
    >
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/20 backdrop-blur-md bg-white/70 dark:bg-slate-900/70">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={36} className="rounded-xl" />
            <span className="font-black text-slate-800 dark:text-slate-100 text-base tracking-tight">
              آکادمی آنالیفای
            </span>
          </Link>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-300/30 dark:shadow-indigo-900/30 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' }}
          >
            ورود با کد دعوت
            <ArrowLeft size={15} />
          </Link>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200/60 dark:border-slate-700/60 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-2">
            <Logo size={24} className="rounded-lg opacity-70" />
            <span>آکادمی آنالیفای · یادگیری به سبک مکالمه</span>
          </div>
          <span>© ۱۴۰۴ Analyfy · تمامی حقوق محفوظ است</span>
        </div>
      </footer>
    </div>
  );
}
