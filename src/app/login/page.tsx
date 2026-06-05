'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

type Mode = 'login' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('login');

  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--background)' }}>
      <div
        className="w-full max-w-sm rounded-3xl p-8 space-y-6 shadow-sm border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-chat-bg)' }}
      >
        <div className="text-center space-y-1">
          <Logo size={52} className="mx-auto mb-4 rounded-2xl" />
          <h1 className="text-xl font-bold">
            {mode === 'login' ? 'ورود به آکادمی آنالیفای' : 'عضویت در آکادمی'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
            {mode === 'login' ? 'برای شروع یادگیری وارد شوید' : 'کد دعوت خود را وارد کنید'}
          </p>
        </div>

        {/* Mode toggle */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ backgroundColor: 'var(--color-muted)' }}>
          {(['login', 'signup'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                backgroundColor: mode === m ? 'white' : 'transparent',
                color: mode === m ? '#6c63ff' : 'var(--color-muted-foreground)',
                boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {m === 'login' ? 'ورود' : 'عضویت'}
            </button>
          ))}
        </div>

        {mode === 'login' ? <LoginPanel /> : <SignupPanel />}

        <p className="text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          <Link href="/" className="hover:underline">← بازگشت به صفحه اصلی</Link>
        </p>
      </div>
    </main>
  );
}

// ── Login panel ──────────────────────────────────────────────
function LoginPanel() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message); else setSent(true);
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="text-4xl">📬</p>
        <p className="font-medium">لینک ورود ارسال شد!</p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          ایمیل <strong>{email}</strong> را بررسی کنید و روی لینک کلیک کنید.
        </p>
        <button onClick={() => setSent(false)} className="text-sm underline" style={{ color: '#6c63ff' }}>
          ارسال مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={handleGoogle} disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border font-medium text-sm transition-colors hover:opacity-80 disabled:opacity-50"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <GoogleIcon /> ورود با Google
      </button>

      <Divider />

      <form onSubmit={handleMagicLink} className="space-y-3">
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="آدرس ایمیل" required
          className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors focus:border-[#6c63ff]"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)', textAlign: 'right' }}
          dir="ltr"
        />
        <button
          type="submit" disabled={loading || !email}
          className="w-full py-3 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
          style={{ backgroundColor: '#6c63ff' }}
        >
          {loading ? 'در حال ارسال...' : 'ارسال لینک ورود'}
        </button>
      </form>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </div>
  );
}

// ── Signup panel — invite-gated ──────────────────────────────
function SignupPanel() {
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [state, setState]     = useState<'idle' | 'waitlisted' | 'sent'>('idle');
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true); setError('');

    const trimCode = code.trim().toUpperCase();

    // ── No code → waitlist ────────────────────────────────────
    if (!trimCode) {
      const { error: wlErr } = await supabase
        .from('waitlist')
        .insert({ email: email.toLowerCase() });

      setLoading(false);
      if (wlErr) {
        setError(wlErr.code === '23505'
          ? 'این ایمیل قبلاً در لیست انتظار ثبت شده است.'
          : wlErr.message);
      } else {
        setState('waitlisted');
      }
      return;
    }

    // ── Code provided → validate ──────────────────────────────
    const { data: owner, error: ownerErr } = await supabase
      .from('profiles')
      .select('id, invite_quota, invite_created_at')
      .eq('invite_code', trimCode)
      .single();

    if (ownerErr || !owner) {
      setLoading(false);
      setError('کد دعوت معتبر نیست.');
      return;
    }

    // Count how many users this code owner has already invited
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('invited_by', owner.id);

    const usedCount = count ?? 0;
    let quota = owner.invite_quota;

    if (usedCount >= quota) {
      // ── Check 7-day upgrade window ────────────────────────
      const createdAt = new Date(owner.invite_created_at);
      const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince <= 7) {
        // Fetch the upgrade_levels ladder from system_settings
        const { data: settings } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'invite_rules')
          .single();

        const levels: number[] =
          settings?.value?.upgrade_levels ?? [10, 20, 30, 50, 70, 100, 150, 200, 250, 300, 400, 500, 1000, 5000];

        // Find the next tier strictly above the current quota
        const nextTier = levels.find(l => l > quota);
        quota = nextTier ?? quota + 10;   // fallback: +10 if already past all tiers

        await supabase
          .from('profiles')
          .update({ invite_quota: quota })
          .eq('id', owner.id);
      } else {
        setLoading(false);
        setError('ظرفیت این کد پر شده است.');
        return;
      }
    }

    // Pass inviter ID via redirect URL so the server-side callback can write
    // invited_by to the new profile — more reliable than localStorage
    // (works even if user opens the magic link in a different browser).
    const redirectTo =
      `${location.origin}/auth/callback?invited_by=${encodeURIComponent(owner.id)}`;

    const { error: authErr } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
    });

    setLoading(false);
    if (authErr) setError(authErr.message);
    else setState('sent');
  }

  // ── Waitlisted ───────────────────────────────────────────────
  if (state === 'waitlisted') {
    return (
      <div className="text-center space-y-4 py-4" dir="rtl">
        <p className="text-5xl">⏳</p>
        <p className="font-bold text-base">در لیست انتظار قرار گرفتید!</p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-muted-foreground)' }}>
          عضویت در آکادمی فعلاً محدود است. ایمیل{' '}
          <strong className="text-slate-700">{email}</strong> در لیست انتظار ثبت شد.
          به محض آزاد شدن ظرفیت، با شما تماس می‌گیریم.
        </p>
        <div
          className="rounded-2xl px-4 py-3 text-sm text-right"
          style={{ backgroundColor: '#f0f9ff', color: '#0369a1' }}
        >
          💡 اگر کد دعوت دارید، همین الان می‌توانید عضو شوید.
        </div>
        <button
          onClick={() => { setState('idle'); setCode(''); }}
          className="text-sm underline" style={{ color: '#6c63ff' }}
        >
          بازگشت و وارد کردن کد دعوت
        </button>
      </div>
    );
  }

  // ── Link sent ────────────────────────────────────────────────
  if (state === 'sent') {
    return (
      <div className="text-center space-y-3 py-4">
        <p className="text-4xl">📬</p>
        <p className="font-medium">لینک عضویت ارسال شد!</p>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          ایمیل <strong>{email}</strong> را بررسی کنید و روی لینک کلیک کنید.
        </p>
      </div>
    );
  }

  // ── Idle form ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSignup} className="space-y-3" dir="rtl">
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)}
        placeholder="آدرس ایمیل" required
        className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors focus:border-[#6c63ff]"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)', textAlign: 'left' }}
        dir="ltr"
      />

      <div className="space-y-1">
        <input
          type="text" value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="کد دعوت  (مثال: AMIN8392)"
          maxLength={12}
          className="w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors focus:border-[#6c63ff] tracking-widest font-mono text-center"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
          dir="ltr"
        />
        <p className="text-xs px-1" style={{ color: 'var(--color-muted-foreground)' }}>
          بدون کد دعوت، ایمیل شما در لیست انتظار ثبت می‌شود.
        </p>
      </div>

      <button
        type="submit" disabled={loading || !email}
        className="w-full py-3 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
        style={{ backgroundColor: '#6c63ff' }}
      >
        {loading
          ? 'در حال بررسی...'
          : code.trim()
            ? 'تأیید کد و ارسال لینک عضویت'
            : 'ثبت در لیست انتظار'}
      </button>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}
    </form>
  );
}

function Divider() {
  return (
    <div className="relative">
      <hr style={{ borderColor: 'var(--color-border)' }} />
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs px-2"
        style={{ color: 'var(--color-muted-foreground)', backgroundColor: 'var(--color-chat-bg)' }}
      >
        یا
      </span>
    </div>
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
