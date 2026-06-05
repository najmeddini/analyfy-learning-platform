'use client';

import { useState } from 'react';
import { MessageSquare, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentBoxProps {
  topicId: string;
  onDone: () => void;
}

export default function CommentBox({ topicId, onDone }: CommentBoxProps) {
  const [content, setContent] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic_id: topicId, content, is_public_consent: isPublic }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? 'خطا در ارسال');
    } else {
      setSubmitted(true);
      setTimeout(onDone, 1500);
    }
    setLoading(false);
  }

  return (
    <div
      className="border-t px-4 py-4"
      style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
    >
      <AnimatePresence mode="wait">
        {submitted ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center text-sm text-green-600 py-2"
          >
            <Check size={16} />
            نظر شما با موفقیت ثبت شد
          </motion.div>
        ) : (
          <motion.form
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onSubmit={handleSubmit}
            className="max-w-2xl mx-auto space-y-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare size={14} style={{ color: '#6c63ff' }} />
              <span className="text-sm font-medium">بازتاب یادگیری خود را بنویسید</span>
              <button
                type="button"
                onClick={onDone}
                className="mr-auto text-xs"
                style={{ color: 'var(--color-muted-foreground)' }}
              >
                رد کردن
              </button>
            </div>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="چه چیزی یاد گرفتید؟ چه سوالی دارید؟"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border text-sm outline-none resize-none transition-colors focus:border-[#6c63ff]"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-muted)',
                textAlign: 'right',
              }}
            />

            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#6c63ff' }}
              />
              اجازه می‌دهم این نظر برای دانشجویان دیگر نمایش داده شود
            </label>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="px-5 py-2.5 rounded-2xl text-white text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 active:scale-95"
              style={{ backgroundColor: '#6c63ff' }}
            >
              {loading ? 'در حال ارسال...' : 'ارسال نظر'}
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
