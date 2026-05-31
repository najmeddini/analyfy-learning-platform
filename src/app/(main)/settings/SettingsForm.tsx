'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';
import { Save, Check } from 'lucide-react';

interface Props {
  user: { id: string; email: string };
  profile: Profile | null;
}

export default function SettingsForm({ user, profile }: Props) {
  const supabase = createClient();

  const [form, setForm] = useState({
    display_name: profile?.display_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    linkedin_url: profile?.linkedin_url ?? '',
    website_url: profile?.website_url ?? '',
    expertise: profile?.expertise ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function onChange(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setSaved(false);
    setError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('profiles')
      .update({
        display_name: form.display_name || null,
        username: form.username.toLowerCase().replace(/[^a-z0-9_]/g, '') || null,
        bio: form.bio || null,
        linkedin_url: form.linkedin_url || null,
        website_url: form.website_url || null,
        expertise: form.expertise || null,
      })
      .eq('user_id', user.id);

    setSaving(false);
    if (err) {
      setError(err.code === '23505' ? 'این نام کاربری قبلاً استفاده شده' : err.message);
    } else {
      setSaved(true);
    }
  }

  const fields = [
    { key: 'display_name', label: 'نام نمایشی', placeholder: 'آیدین رضایی', type: 'text' },
    { key: 'username', label: 'نام کاربری', placeholder: 'aydin_r', type: 'text', hint: 'فقط حروف انگلیسی، اعداد و _' },
    { key: 'bio', label: 'درباره من', placeholder: 'توسعه‌دهنده پایتون با ۵ سال تجربه...', type: 'textarea' },
    { key: 'expertise', label: 'تخصص', placeholder: 'Python, Data Analysis, Machine Learning', type: 'text' },
    { key: 'linkedin_url', label: 'لینک LinkedIn', placeholder: 'https://linkedin.com/in/...', type: 'url' },
    { key: 'website_url', label: 'وب‌سایت', placeholder: 'https://...', type: 'url' },
  ] as const;

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Email (readonly) */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">ایمیل</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-4 py-2.5 rounded-2xl border text-sm opacity-50 cursor-not-allowed"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-muted)' }}
        />
      </div>

      {fields.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label className="text-sm font-medium">{field.label}</label>
          {field.type === 'textarea' ? (
            <textarea
              value={form[field.key]}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="w-full px-4 py-2.5 rounded-2xl border text-sm resize-none outline-none focus:ring-2 focus:ring-[#6c63ff40]"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--background)' }}
            />
          ) : (
            <input
              type={field.type}
              value={form[field.key]}
              onChange={e => onChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className="w-full px-4 py-2.5 rounded-2xl border text-sm outline-none focus:ring-2 focus:ring-[#6c63ff40]"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--background)' }}
            />
          )}
          {'hint' in field && (
            <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
              {field.hint}
            </p>
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#6c63ff' }}
      >
        {saved ? <Check size={16} /> : <Save size={16} />}
        {saving ? 'در حال ذخیره...' : saved ? 'ذخیره شد' : 'ذخیره تغییرات'}
      </button>
    </form>
  );
}
