'use client';

import { useState } from 'react';
import { Copy, Check, Users, Zap, UserCheck } from 'lucide-react';

interface Invitee {
  display_name: string | null;
  email: string;
  created_at: string;
}

interface Props {
  inviteCode: string | null;
  inviteQuota: number;
  inviteCreatedAt: string;
  invitees: Invitee[];
  inviterName: string | null;
}

/** Mask an email: a***@gmail.com */
function maskEmail(email: string): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return email;
  const visible = local.slice(0, 1);
  return `${visible}***@${domain}`;
}

export default function InviteNetwork({
  inviteCode,
  inviteQuota,
  inviteCreatedAt,
  invitees,
  inviterName,
}: Props) {
  const [copied, setCopied] = useState(false);

  const usedCount = invitees.length;
  const remaining = Math.max(0, inviteQuota - usedCount);
  const fillPct   = inviteQuota > 0 ? Math.min(100, (usedCount / inviteQuota) * 100) : 0;

  // Days left in the 7-day renewal window
  const createdAt    = new Date(inviteCreatedAt);
  const daysSince    = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const daysLeft     = Math.max(0, 7 - Math.floor(daysSince));
  const inWindow     = daysSince <= 7;
  const quotaFull    = usedCount >= inviteQuota;
  const canAutoRenew = quotaFull && inWindow;

  function copyCode() {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!inviteCode) {
    return (
      <div
        className="rounded-3xl p-6 space-y-2 border"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-chat-bg)' }}
      >
        <h2 className="text-lg font-bold">شبکه دعوت من</h2>
        <p className="text-sm" style={{ color: 'var(--color-muted-foreground)' }}>
          کد دعوت شما هنوز تولید نشده. لطفاً Migration 009 را در Supabase اجرا کنید.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-3xl border overflow-hidden"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-chat-bg)' }}
    >
      {/* Header */}
      <div
        className="px-6 pt-6 pb-4 space-y-1"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Users size={18} style={{ color: '#6c63ff' }} />
          <h2 className="text-lg font-bold">شبکه دعوت من</h2>
        </div>
        {inviterName && (
          <div className="flex items-center gap-1.5 mt-1">
            <UserCheck size={13} style={{ color: '#22c55e' }} />
            <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              دعوت شده توسط:{' '}
              <strong className="text-slate-700">{inviterName}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="px-6 py-5 space-y-6">
        {/* ── Invite code card ─────────────────────────────────── */}
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ backgroundColor: '#f5f3ff' }}
        >
          <p className="text-xs font-semibold" style={{ color: '#6c63ff' }}>کد دعوت شما</p>
          <div className="flex items-center gap-3">
            <span
              className="flex-1 text-2xl font-black tracking-widest text-center py-2 rounded-xl"
              style={{ color: '#6c63ff', backgroundColor: 'white', fontFamily: 'monospace', letterSpacing: '0.25em' }}
            >
              {inviteCode}
            </span>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95 flex-shrink-0"
              style={{ backgroundColor: copied ? '#16a34a' : '#6c63ff' }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'کپی شد!' : 'کپی'}
            </button>
          </div>
          <p className="text-xs text-center" style={{ color: '#7c3aed' }}>
            این کد را با دوستانت به اشتراک بگذار تا بتوانند عضو آکادمی شوند.
          </p>
        </div>

        {/* ── Progress bar ─────────────────────────────────────── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">
              {usedCount} از {inviteQuota} ظرفیت استفاده شده
            </span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: remaining === 0 ? '#fee2e2' : '#dcfce7',
                color:           remaining === 0 ? '#dc2626' : '#16a34a',
              }}
            >
              {remaining} باقی‌مانده
            </span>
          </div>

          {/* Progress track */}
          <div className="relative h-3 rounded-full overflow-hidden" style={{ backgroundColor: '#e5e7eb' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${fillPct}%`,
                background: fillPct >= 100
                  ? 'linear-gradient(90deg, #dc2626, #f97316)'
                  : 'linear-gradient(90deg, #6c63ff, #8b5cf6)',
              }}
            />
          </div>

          {/* Urgency / renewal hint */}
          {canAutoRenew ? (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
            >
              <Zap size={13} />
              ظرفیت پر شده! اگر {daysLeft} روز دیگر {inviteQuota + 10 - usedCount} نفر دیگر دعوت کنی، ظرفیت تمدید می‌شود.
            </div>
          ) : inWindow && !quotaFull ? (
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium"
              style={{ backgroundColor: '#f0fdf4', color: '#166534' }}
            >
              <Zap size={13} />
              اگر در کمتر از <strong>{daysLeft}</strong> روز ظرفیت را پر کنید، دعوتنامه‌های شما تمدید می‌شود!
            </div>
          ) : null}
        </div>

        {/* ── Invitees list ─────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Users size={14} style={{ color: '#6c63ff' }} />
            افراد دعوت‌شده توسط شما
          </h3>

          {invitees.length === 0 ? (
            <div
              className="rounded-2xl px-4 py-6 text-center text-sm"
              style={{ backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }}
            >
              هنوز کسی با کد شما عضو نشده.
              <br />
              کد را با دوستانت به اشتراک بگذار! 🚀
            </div>
          ) : (
            <div className="rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
              {invitees.map((inv, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 text-sm"
                  style={{
                    borderTop: i > 0 ? '1px solid var(--color-border)' : 'none',
                    backgroundColor: i % 2 === 0 ? 'white' : 'var(--color-muted)',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#6c63ff' }}
                  >
                    {(inv.display_name?.[0] ?? inv.email[0] ?? '?').toUpperCase()}
                  </div>

                  {/* Name + masked email */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {inv.display_name ?? <span style={{ color: 'var(--color-muted-foreground)' }}>کاربر</span>}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-muted-foreground)', direction: 'ltr', textAlign: 'right' }}>
                      {maskEmail(inv.email)}
                    </p>
                  </div>

                  {/* Join date */}
                  <p className="text-xs flex-shrink-0" style={{ color: 'var(--color-muted-foreground)' }}>
                    {new Date(inv.created_at).toLocaleDateString('fa-IR', {
                      year: 'numeric', month: 'short', day: 'numeric',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
