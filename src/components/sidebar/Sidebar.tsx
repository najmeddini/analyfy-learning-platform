'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User } from '@supabase/supabase-js';
import type { Profile, RecentThread } from '@/types';
import { createClient } from '@/lib/supabase/client';
import SearchModal from '@/components/ui/SearchModal';
import {
  BookOpen,
  Search,
  Clock,
  FolderOpen,
  Award,
  Heart,
  LogOut,
  Settings,
  Menu,
  X,
  MessageCircle,
} from 'lucide-react';

interface SidebarProps {
  user: User | null;
  profile: Profile | null;
}

type NavLink = { label: string; icon: React.ElementType; href: string; isSearch?: false; auth?: boolean };
type NavSearch = { label: string; icon: React.ElementType; isSearch: true };
type NavItem = NavLink | NavSearch;

const navItems: NavItem[] = [
  { label: 'دوره‌ها',    icon: BookOpen,    href: '/explore' },
  { label: 'جستجو',     icon: Search,      isSearch: true },
  { label: 'پروژه‌ها',  icon: FolderOpen,  href: '/projects',    auth: true },
  { label: 'گواهینامه', icon: Award,       href: '/certificate', auth: true },
  { label: 'حامیان',    icon: Heart,       href: '/sponsors' },
  { label: 'تاریخچه',   icon: Clock,       href: '/history',     auth: true },
];

export default function Sidebar({ user, profile }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [threads, setThreads] = useState<RecentThread[]>([]);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Fetch recent lesson threads for authenticated users
  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_progress')
      .select('lesson_id, lesson_title, last_reviewed')
      .eq('user_id', user.id)
      .order('last_reviewed', { ascending: false })
      .limit(15)
      .then(({ data }) => setThreads(data ?? []));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Global CMD+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const sidebarContent = (
    <aside
      className="flex flex-col h-full w-64 border-l flex-shrink-0"
      style={{ backgroundColor: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-3 px-4 py-4 border-b flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
          style={{ backgroundColor: '#6c63ff' }}
        >
          A
        </div>
        <span className="font-bold text-sm">آکادمی آنالیفای</span>
        <button
          className="mr-auto p-1 rounded-lg md:hidden hover:bg-[var(--color-muted)]"
          onClick={() => setMobileOpen(false)}
        >
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="px-2 pt-2 flex-shrink-0">
        <ul className="space-y-0.5">
          {navItems.map((item, idx) => {
            if (item.isSearch) {
              const Icon = item.icon;
              return (
                <li key="search">
                  <button
                    onClick={() => setSearchOpen(true)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right hover:bg-[var(--color-muted)]"
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    <kbd
                      className="text-xs px-1.5 py-0.5 rounded border hidden sm:inline-flex items-center gap-0.5"
                      style={{ borderColor: 'var(--color-border)', color: 'var(--color-muted-foreground)', backgroundColor: 'var(--color-muted)' }}
                    >
                      ⌘K
                    </kbd>
                  </button>
                </li>
              );
            }

            const { href, auth: requiresAuth, icon: Icon } = item as NavLink;
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

            return (
              <li key={idx}>
                {requiresAuth && !user ? (
                  <button
                    onClick={() => router.push('/login')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-right hover:bg-[var(--color-muted)]"
                    style={{ color: 'var(--color-muted-foreground)' }}
                  >
                    <Icon size={16} className="flex-shrink-0" />
                    {item.label}
                  </button>
                ) : (
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                    style={{
                      backgroundColor: isActive ? '#6c63ff15' : 'transparent',
                      color: isActive ? '#6c63ff' : 'var(--foreground)',
                    }}
                  >
                    <Icon
                      size={16}
                      className="flex-shrink-0"
                      style={{ color: isActive ? '#6c63ff' : 'var(--color-muted-foreground)' }}
                    />
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Recent Threads */}
      {user && threads.length > 0 && (
        <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
          <p
            className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-muted-foreground)' }}
          >
            اخیر
          </p>
          <ul className="space-y-0.5">
            {threads.map((thread) => {
              const isActive = pathname === `/learn/${thread.lesson_id}`;
              return (
                <li key={thread.lesson_id}>
                  <Link
                    href={`/learn/${thread.lesson_id}`}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-colors truncate"
                    style={{
                      backgroundColor: isActive ? '#6c63ff15' : 'transparent',
                      color: isActive ? '#6c63ff' : 'var(--color-muted-foreground)',
                    }}
                    title={thread.lesson_title ?? thread.lesson_id}
                  >
                    <MessageCircle size={12} className="flex-shrink-0" />
                    <span className="truncate">
                      {thread.lesson_title ?? thread.lesson_id.slice(0, 12) + '...'}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Spacer when no threads */}
      {(!user || threads.length === 0) && <div className="flex-1" />}

      {/* Profile + Settings */}
      <div
        className="px-3 py-3 border-t flex-shrink-0"
        style={{ borderColor: 'var(--color-border)' }}
      >
        {user ? (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: '#6c63ff' }}
            >
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                (profile?.display_name?.[0] ?? user.email?.[0] ?? 'ک').toUpperCase()
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {profile?.display_name ?? user.email?.split('@')[0] ?? 'کاربر'}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--color-muted-foreground)' }}>
                {user.email}
              </p>
            </div>
            <Link
              href="/settings"
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors flex-shrink-0"
              title="تنظیمات"
            >
              <Settings size={15} style={{ color: 'var(--color-muted-foreground)' }} />
            </Link>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors flex-shrink-0"
              title="خروج"
            >
              <LogOut size={15} style={{ color: 'var(--color-muted-foreground)' }} />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-white text-sm font-bold transition-all hover:opacity-90"
            style={{ backgroundColor: '#6c63ff' }}
          >
            ورود / ثبت‌نام
          </Link>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="fixed top-4 right-4 z-50 p-2 rounded-xl md:hidden shadow-md border"
        style={{ backgroundColor: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={20} />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute right-0 top-0 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Search Modal */}
      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} user={user} />}
    </>
  );
}
