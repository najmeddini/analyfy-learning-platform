'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div
        className="w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-sm border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-chat-bg)' }}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4" style={{ backgroundColor: '#6c63ff' }}>
            ی
          </div>
          <h1 className="text-xl font-bold">ورود به پلتفرم</h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            برای شروع یادگیری وارد شوید
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-3 py-4">
            <p className="text-4xl">📬</p>
            <p className="font-medium">لینک ورود ارسال شد!</p>
            <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
              ایمیل <strong>{email}</strong> را بررسی کنید و روی لینک کلیک کنید.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm underline"
              style={{ color: '#6c63ff' }}
            >
              ارسال مجدد
            </button>
          </div>
        ) : (
          <>
            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border font-medium text-sm transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <GoogleIcon />
              ورود با Google
            </button>

            <div className="relative">
              <hr style={{ borderColor: 'var(--color-border)' }} />
              <span
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs px-2"
                style={{ color: 'var(--color-muted-foreground)', backgroundColor: 'var(--color-chat-bg)' }}
              >
                یا
              </span>
            </div>

            {/* Magic Link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="آدرس ایمیل"
                required
                className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors focus:border-[#6c63ff]"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-muted)',
                  textAlign: 'right',
                }}
                dir="ltr"
              />
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
                style={{ backgroundColor: '#6c63ff' }}
              >
                {loading ? 'در حال ارسال...' : 'ارسال لینک ورود'}
              </button>
            </form>
          </>
        )}

        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}

        <p className="text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <Link href="/" className="hover:underline">
            ← بازگشت به صفحه اصلی
          </Link>
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
