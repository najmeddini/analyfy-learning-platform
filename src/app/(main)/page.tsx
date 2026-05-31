import Link from 'next/link';
import { BookOpen, Search, FolderOpen, Award } from 'lucide-react';

export default function MainPage() {
  return (
    <div
      className="flex-1 flex items-center justify-center"
      style={{ backgroundColor: 'var(--color-chat-bg)' }}
    >
      <div className="text-center space-y-6 max-w-sm px-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto text-white text-2xl font-black"
          style={{ backgroundColor: '#6c63ff' }}
        >
          A
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">به آکادمی آنالیفای خوش آمدید</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
            یادگیری مکالمه‌محور با هوش مصنوعی — یک دوره انتخاب کنید و شروع کنید.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2">
          {[
            { href: '/explore', icon: <BookOpen size={16} />, label: 'کاوش دوره‌ها' },
            { href: '/history', icon: <Search size={16} />, label: 'تاریخچه یادگیری' },
            { href: '/projects', icon: <FolderOpen size={16} />, label: 'پروژه‌های من' },
            { href: '/certificate', icon: <Award size={16} />, label: 'گواهینامه‌ها' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-all hover:shadow-sm hover:-translate-y-0.5"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
            >
              <span style={{ color: '#6c63ff' }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
