'use client';

import Link from 'next/link';
import {
  MessageSquare,
  Zap,
  ShieldCheck,
  TrendingUp,
  Eye,
  Users,
  ArrowLeft,
  Sparkles,
  BookMarked,
  BrainCircuit,
} from 'lucide-react';
import Logo from '@/components/ui/Logo';

export default function MainPage() {
  return (
    <div
      dir="rtl"
      className="flex-1 overflow-y-auto"
      style={{
        fontFamily: "'Vazirmatn', sans-serif",
        backgroundColor: 'var(--color-chat-bg)',
      }}
    >
      {/* ───────────── HERO ───────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 py-20 overflow-hidden">
        {/* Background gradient blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[-10%] right-[-5%] w-[480px] h-[480px] rounded-full bg-indigo-400/20 blur-[120px]" />
          <div className="absolute bottom-[-5%] left-[5%] w-[360px] h-[360px] rounded-full bg-violet-400/15 blur-[100px]" />
        </div>

        <div className="max-w-3xl w-full text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm">
            <Sparkles size={13} />
            دسترسی محدود · فقط با کد دعوت
          </div>

          {/* Headline — The Hook */}
          <h1 className="text-4xl sm:text-5xl font-black leading-snug tracking-tight text-slate-800 dark:text-slate-50">
            هر روز محتوا نگاه می‌کنی.
            <br />
            <span className="bg-gradient-to-l from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              هنوز پروژه‌ات تموم نشده.
            </span>
          </h1>

          {/* Sub-headline — The Promise */}
          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
            آکادمی آنالیفای اولین پلتفرمی‌ه که{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">
              یادگیری رو به مکالمه تبدیل می‌کنه
            </span>
            . با هوش مصنوعی تمرین می‌کنی، خطاهاتو می‌فهمی، و مهارت واقعی می‌سازی.
          </p>

          {/* Primary CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-base font-bold text-white shadow-lg shadow-indigo-300/40 dark:shadow-indigo-900/40 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-400/40"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
              }}
            >
              ورود با کد دعوت
              <ArrowLeft size={17} />
            </Link>
            <span className="text-sm text-slate-400 dark:text-slate-500">
              کد دعوت داری؟ همین‌جا شروع کن.
            </span>
          </div>

          {/* Glassmorphism floating cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            {[
              {
                icon: <BrainCircuit size={20} className="text-indigo-500" />,
                title: 'تدریس با AI',
                desc: 'مثل یه استاد واقعی — سوال می‌پرسه، توضیح می‌ده، راهنماییت می‌کنه.',
              },
              {
                icon: <BookMarked size={20} className="text-violet-500" />,
                title: 'پروژه‌محور',
                desc: 'هر درس به یه خروجی واقعی ختم می‌شه، نه فقط یه ویدیوی دیده‌شده.',
              },
              {
                icon: <TrendingUp size={20} className="text-emerald-500" />,
                title: 'مهارت قابل اثبات',
                desc: 'گواهینامه‌ای که بشه روی رزومه گذاشت — نه فقط یه PDF.',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl p-4 text-right border border-white/40 dark:border-slate-700/60 shadow-lg backdrop-blur-md text-sm space-y-1.5"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.3) 100%)',
                }}
              >
                <div className="flex items-center gap-2">
                  {card.icon}
                  <span className="font-bold text-slate-800 dark:text-slate-100">{card.title}</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── AGITATION — The Invisible Problem ───────────── */}
      <section className="px-6 py-20 max-w-5xl mx-auto">
        <div className="text-center space-y-3 mb-14">
          <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">
            پلتفرم‌های قدیمی چرا جواب نمی‌دن؟
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            مشکل از تو نیست. مشکل از روش یادگیریه.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Eye size={28} className="text-rose-400" />,
              title: 'تماشا ≠ یادگیری',
              desc: 'وقتی فقط ویدیو نگاه می‌کنی، ذهنت وانمود می‌کنه که یاد گرفتی. ۴۸ ساعت بعد ۷۰٪ فراموش شده.',
            },
            {
              icon: <MessageSquare size={28} className="text-amber-400" />,
              title: 'هیچکس جواب سوالتو نمی‌ده',
              desc: 'توی فروم‌ها گم می‌شی. استاد دسترس‌پذیر نیست. اشتباهت رو کسی تصحیح نمی‌کنه.',
            },
            {
              icon: <Users size={28} className="text-blue-400" />,
              title: 'محتوا برای ایران نیست',
              desc: 'بیشتر دوره‌ها برای بازار کار آمریکاست — نه برای بازار کار ایران، نه برای مشکلات واقعی تو.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-md dark:shadow-slate-900/30 space-y-3 text-right"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white dark:bg-slate-800 shadow-sm">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ───────────── SOLUTION — Variable Reward ───────────── */}
      <section
        className="px-6 py-20"
        style={{ backgroundColor: 'var(--background)' }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-3 mb-14">
            <h2 className="text-3xl font-black text-slate-800 dark:text-slate-100">
              روش آنالیفای فرق داره
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base max-w-lg mx-auto">
              به‌جای تماشا، <span className="font-semibold text-indigo-600 dark:text-indigo-400">مکالمه</span> می‌کنی.
              به‌جای حفظ کردن، <span className="font-semibold text-indigo-600 dark:text-indigo-400">تمرین</span> می‌کنی.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: <BrainCircuit size={22} className="text-indigo-500" />,
                title: 'AI استادته، نه ربات',
                desc: 'درس‌ها به‌صورت مکالمه پیش می‌ره. سوال می‌پرسه، چالش می‌ده، و دقیقاً اونجایی که گیر کردی راهنماییت می‌کنه.',
              },
              {
                icon: <Zap size={22} className="text-amber-500" />,
                title: 'فیدبک فوری',
                desc: 'دیگه لازم نیست ساعت‌ها صبر کنی. اشتباهت رو همون لحظه می‌فهمی و می‌دونی چطور درستش کنی.',
              },
              {
                icon: <ShieldCheck size={22} className="text-emerald-500" />,
                title: 'پروژه واقعی، نه تمرین کاغذی',
                desc: 'هر مسیر یادگیری به یه پروژه ختم می‌شه که می‌تونی روی پورتفولیوت بذاری.',
              },
              {
                icon: <TrendingUp size={22} className="text-violet-500" />,
                title: 'مسیر یادگیری شخصی‌سازی‌شده',
                desc: 'سیستم یاد می‌گیره کجا ضعیفی و محتوا رو برای تو تنظیم می‌کنه — نه برای یه کاربر فرضی.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-4 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm"
                style={{ backgroundColor: 'var(--color-chat-bg)' }}
              >
                <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/60">
                  {item.icon}
                </div>
                <div className="space-y-1 text-right">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{item.title}</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── EARLY ADOPTER / FOOTER CTA ───────────── */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <Sparkles size={12} />
            ظرفیت محدود · فقط با کد دعوت
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 dark:text-slate-100">
            اولین نفری باش که
            <br />
            <span className="bg-gradient-to-l from-indigo-600 to-violet-500 bg-clip-text text-transparent">
              درست یاد می‌گیره.
            </span>
          </h2>

          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed">
            آکادمی آنالیفای الان در مرحله MVP هست و فقط به اعضای دعوت‌شده دسترسی داره.
            اگه کد دعوت داری، همین الان وارد شو.
          </p>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-bold text-white shadow-xl shadow-indigo-300/30 dark:shadow-indigo-900/40 transition-all hover:-translate-y-1 hover:shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            }}
          >
            ورود با کد دعوت
            <ArrowLeft size={17} />
          </Link>

          <div className="flex items-center justify-center gap-6 pt-4">
            <Logo size={32} className="opacity-60" />
            <span className="text-xs text-slate-400 dark:text-slate-500">
              آکادمی آنالیفای · یادگیری به سبک مکالمه
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
