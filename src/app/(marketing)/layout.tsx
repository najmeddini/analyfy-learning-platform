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
      style={{ fontFamily: "'Vazirmatn', sans-serif" }}
    >
      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 backdrop-blur-md bg-white/80 shadow-sm shadow-slate-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={36} className="rounded-xl" />
            <span className="font-black text-slate-900 text-base tracking-tight">
              آکادمی آنالیفای
            </span>
          </Link>

          {/* CTA */}
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-md shadow-indigo-300/40 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-300/50"
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
      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <Logo size={24} className="rounded-lg opacity-60" />
            <span>آکادمی آنالیفای · یادگیری به سبک مکالمه</span>
          </div>
          <span>© ۱۴۰۴ Analyfy · تمامی حقوق محفوظ است</span>
        </div>
      </footer>
    </div>
  );
}
