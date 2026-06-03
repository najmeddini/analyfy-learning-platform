'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Lesson, Topic, ChatMessage, QuizQuestion } from '@/types';
import { nanoid } from '@/lib/nanoid';
import ChatArea from './ChatArea';
import GuestTeaser from './GuestTeaser';
import BountyBadge from '../ui/BountyBadge';
import { ArrowRight, Send } from 'lucide-react';

interface Props {
  lesson: Lesson;
  topic: Topic | null;
  courseSlug: string;
  lessonSlug: string;
  nextLessonUrl: string | null;
  user: { id: string; email: string } | null;
  isBot: boolean;
  isAlreadyCompleted: boolean;
}

/** Parse quiz from Quiz_Content field (separate from lesson Content) */
function parseQuizContent(quizContent: string): QuizQuestion | null {
  if (!quizContent.trim()) return null;
  const lines = quizContent.split('\n').filter(l => l.trim());
  const optionLines = lines.filter(l => /^- \[[ x]\]/.test(l));
  if (optionLines.length < 2) return null;

  const options = optionLines.map(l => ({
    isCorrect: l.startsWith('- [x]'),
    text: l.replace(/^- \[[ x]\]\s*/, '').trim(),
  }));

  const firstOptionIdx = lines.findIndex(l => /^- \[[ x]\]/.test(l));
  const questionLine = lines.slice(0, firstOptionIdx).filter(l => l.trim()).pop();

  return {
    question: questionLine ?? 'کدام گزینه درست است؟',
    options,
    answered: false,
    selectedIndex: null,
  };
}

async function animateText(
  text: string,
  onChunk: (t: string) => void,
  skip: boolean
): Promise<void> {
  if (skip) { onChunk(text); return; }
  const chunkSize = 4;
  const delay = 14;
  for (let i = chunkSize; i <= text.length; i += chunkSize) {
    onChunk(text.slice(0, i));
    await new Promise(r => setTimeout(r, delay));
  }
  onChunk(text);
}

export default function LessonChatShell({
  lesson,
  topic,
  courseSlug,
  lessonSlug,
  nextLessonUrl,
  user,
  isBot,
  isAlreadyCompleted,
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [lessonDone, setLessonDone] = useState(isAlreadyCompleted);
  const [chatInput, setChatInput] = useState('');
  const [isOptOut, setIsOptOut] = useState(false); // unchecked = public by default
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialized = useRef(false);

  const addMessage = useCallback((msg: ChatMessage) => {
    setMessages(prev => [...prev, msg]);
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    runLesson();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runLesson() {
    const skipAnimation = isBot || isAlreadyCompleted;
    const displayContent = lesson.html_content?.trim() || lesson.content;

    const msgId = nanoid();
    addMessage({ id: msgId, role: 'system', content: '', type: 'text', timestamp: new Date() });

    setIsStreaming(!skipAnimation);
    await animateText(displayContent, chunk => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: chunk } : m));
    }, skipAnimation);
    setIsStreaming(false);

    if (lesson.has_quiz && lesson.quiz_content) {
      const quiz = parseQuizContent(lesson.quiz_content);
      if (quiz) {
        addMessage({ id: nanoid(), role: 'system', content: '', type: 'quiz', quizData: quiz, timestamp: new Date() });
        // load comments even when waiting for quiz — they appear below
        await loadComments();
        return;
      }
    }

    showNextButton();
    if (!isAlreadyCompleted) await markDone();
    await loadComments();
  }

  /** Fetch this topic's comments and append them as user bubbles. */
  async function loadComments() {
    if (!user) return; // guests see GuestTeaser, not individual comments
    try {
      const res = await fetch(`/api/comments?topic_id=${encodeURIComponent(lesson.topic_id)}`);
      if (!res.ok) return;
      const { comments } = await res.json();
      if (!comments?.length) return;
      setMessages(prev => {
        // Deduplicate: skip any comment whose id is already in the list
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs: ChatMessage[] = comments
          .filter((c: { id: string }) => !existingIds.has(c.id))
          .map((c: { id: string; content: string; status: string; created_at: string }) => ({
            id: c.id,          // real DB id — survives refreshes
            role: 'user' as const,
            content: c.status === 'pending'
              ? `${c.content}\n\n_در انتظار تأیید..._`
              : c.content,
            type: 'text' as const,
            timestamp: new Date(c.created_at),
          }));
        return [...prev, ...newMsgs];
      });
    } catch (err) {
      console.error('loadComments error:', err);
    }
  }

  function showNextButton() {
    addMessage({
      id: nanoid(),
      role: 'system',
      content: '',
      type: 'next-button',
      nextLessonUrl: user ? nextLessonUrl : null,
      timestamp: new Date(),
    });
  }

  async function markDone() {
    setLessonDone(true); // always update UI; guests see GuestTeaser
    if (!user) return;
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: lesson.id,
        topic_id: lesson.topic_id,
        lesson_title: lesson.title,
        course_slug: courseSlug,
        lesson_slug: lessonSlug,
      }),
    });
  }

  async function handleQuizAnswer(messageId: string, selectedIndex: number) {
    setMessages(prev =>
      prev.map(m =>
        m.id === messageId && m.quizData
          ? { ...m, quizData: { ...m.quizData, answered: true, selectedIndex } }
          : m
      )
    );

    const msg = messages.find(m => m.id === messageId);
    if (!msg?.quizData) return;
    const isCorrect = msg.quizData.options[selectedIndex]?.isCorrect ?? false;
    const correct = msg.quizData.options.find(o => o.isCorrect)?.text ?? '';

    const replyId = nanoid();
    addMessage({ id: replyId, role: 'system', content: '', type: 'text', timestamp: new Date() });

    const replyText = isCorrect
      ? '✅ عالی! پاسخ درست است.'
      : `❌ پاسخ درست نیست. جواب صحیح: **${correct}**`;

    setIsStreaming(true);
    await animateText(replyText, chunk => {
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: chunk } : m));
    }, isBot);
    setIsStreaming(false);

    showNextButton();
    if (!isAlreadyCompleted) await markDone();
  }

  function handleNextLesson(url: string | null | undefined) {
    if (!user) {
      router.push('/login');
      return;
    }
    router.push(url ?? `/course/${courseSlug}`);
  }

  async function handleSendComment() {
    const text = chatInput.trim();
    if (!text || sending) return;
    setSendError(null);
    setSending(true);
    setChatInput('');

    // Optimistic: add user bubble immediately with a temp id
    const tempId = `temp-${nanoid()}`;
    addMessage({ id: tempId, role: 'user', content: text, type: 'text', timestamp: new Date() });

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: lesson.topic_id,
          content: text,
          is_public_consent: !isOptOut,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'خطای ناشناخته' }));
        // Rollback optimistic message
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setChatInput(text); // restore input so user can try again
        setSendError(error ?? 'ارسال ناموفق بود. دوباره امتحان کن.');
        return;
      }

      // Replace temp id with the real DB id so deduplication works on reload
      const { comment } = await res.json();
      if (comment?.id) {
        setMessages(prev =>
          prev.map(m => m.id === tempId ? { ...m, id: comment.id } : m)
        );
      }
    } catch (err) {
      console.error('handleSendComment network error:', err);
      // Network error — rollback
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setChatInput(text);
      setSendError('اتصال قطع است. پیام ذخیره نشد.');
    } finally {
      setSending(false);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendComment();
    }
  }

  async function handleFileUpload(file: File) {
    if (!user || !topic) return;
    const form = new FormData();
    form.append('file', file);
    form.append('topic_id', lesson.topic_id);
    form.append('max_size_mb', String(topic.project_max_size_mb));
    form.append('allowed_extensions', topic.allowed_extensions);
    if (topic.is_bounty_project) form.append('is_bounty_submission', 'true');
    await fetch('/api/projects', { method: 'POST', body: form });
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 border-b flex items-center gap-3 flex-shrink-0"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
      >
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors flex-shrink-0"
        >
          <ArrowRight size={16} style={{ color: 'var(--color-muted-foreground)' }} />
        </button>
        <h1 className="font-semibold text-sm flex-1 truncate">{lesson.title}</h1>

        {topic?.is_bounty_project && (
          <BountyBadge
            prize={topic.bounty_prize}
            sponsorName={topic.bounty_sponsor_name}
            sponsorLogo={topic.bounty_sponsor_logo}
          />
        )}
        {isAlreadyCompleted && (
          <span
            className="text-xs px-2 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: '#22c55e18', color: '#16a34a' }}
          >
            ✅ تکمیل‌شده
          </span>
        )}
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────── */}
      <ChatArea
        messages={messages}
        onQuizAnswer={handleQuizAnswer}
        onNextLesson={handleNextLesson}
        onFileUpload={handleFileUpload}
        isStreaming={isStreaming}
      />

      {/* ── Bottom section ──────────────────────────────────────────────── */}
      {user ? (
        /* Permanent chat input for authenticated users */
        <div
          className="border-t flex-shrink-0 px-4 py-3 space-y-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
        >
          <div className="max-w-2xl mx-auto w-full">
            <div
              className="flex items-end gap-2 rounded-2xl border px-3 py-2 focus-within:border-[#6c63ff] transition-colors"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--background)' }}
            >
              <textarea
                ref={inputRef}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="سوالتو بپرس یا کامنت بذار..."
                rows={1}
                className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                style={{ color: 'var(--foreground)', minHeight: '24px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSendComment}
                disabled={!chatInput.trim() || sending}
                className="p-1.5 rounded-xl flex-shrink-0 transition-colors disabled:opacity-40"
                style={{ backgroundColor: chatInput.trim() ? '#6c63ff' : 'transparent' }}
              >
                <Send size={15} className="text-white" />
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer mt-1.5 px-1">
              <input
                type="checkbox"
                checked={isOptOut}
                onChange={e => setIsOptOut(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#6c63ff' }}
              />
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                نمی‌خواهم این بازتاب به صورت عمومی نمایش داده شود
              </span>
            </label>

            {sendError && (
              <div className="flex items-center justify-between gap-2 mt-1.5 px-3 py-2 rounded-xl text-xs"
                style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
                <span>{sendError}</span>
                <button onClick={() => setSendError(null)} className="font-bold hover:opacity-70">✕</button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Guest teaser — shown after lesson finishes */
        lessonDone && <GuestTeaser topicId={lesson.topic_id} />
      )}
    </div>
  );
}
