import Link from 'next/link';

const features = [
  {
    icon: '💬',
    label: 'درس‌های چتی',
    desc: 'محتوای هر درس مثل مکالمه با یک معلم هوشمند نمایش داده می‌شود',
  },
  {
    icon: '🎮',
    label: 'گیمیفیکیشن',
    desc: 'آزمون‌های تعاملی، پیشرفت قابل مشاهده و گواهینامه تکمیل دوره',
  },
  {
    icon: '📁',
    label: 'پروژه‌ها',
    desc: 'آپلود پروژه مستقیم در پلتفرم و دریافت بازخورد از مدرس',
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#6c63ff] flex items-center justify-center text-white text-2xl font-bold">
            ی
          </div>
          <h1 className="text-3xl font-bold">پلتفرم یادگیری</h1>
        </div>

        <p className="text-xl leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
          یادگیری هوشمند، تعاملی و گیمیفاید.
          <br />
          درس‌ها را مثل یک چت با هوش مصنوعی تجربه کن.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-right">
          {features.map((f) => (
            <li
              key={f.label}
              className="rounded-2xl p-4 space-y-2"
              style={{ backgroundColor: 'var(--color-muted)' }}
            >
              <span className="text-2xl block">{f.icon}</span>
              <p className="font-semibold">{f.label}</p>
              <p style={{ color: 'var(--color-muted-foreground)' }}>{f.desc}</p>
            </li>
          ))}
        </ul>

        <Link
          href="/login"
          className="inline-block px-8 py-4 rounded-2xl text-white font-bold text-lg hover:opacity-90 active:scale-95 transition-all"
          style={{ backgroundColor: '#6c63ff' }}
        >
          شروع یادگیری ←
        </Link>

        <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          ورود با Google یا ایمیل — رایگان
        </p>
      </div>
    </main>
  );
}
