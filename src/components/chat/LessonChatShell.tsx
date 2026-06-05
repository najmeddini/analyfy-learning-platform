'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Lesson, Topic, ChatMessage, QuizQuestion } from '@/types';
import { nanoid } from '@/lib/nanoid';
import ChatArea from './ChatArea';
import GuestTeaser from './GuestTeaser';
import BountyBadge from '../ui/BountyBadge';
import { ArrowRight, Send, Users, X, MessageCircle } from 'lucide-react';

interface CommunityComment {
  id: string;
  content: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

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
  const [isOptOut, setIsOptOut] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [communityComments, setCommunityComments] = useState<CommunityComment[]>([]);
  const [showCommunity, setShowCommunity] = useState(false);
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

  /** Fetch this topic's comments.
   *  - Own comments + approved admin replies to own → personal chat stream.
   *  - Others' approved + public top-level → community drawer state.
   *  Guests return early — GuestTeaser handles their view.
   */
  async function loadComments() {
    if (!user) return;
    try {
      const res = await fetch(`/api/comments?topic_id=${encodeURIComponent(lesson.topic_id)}`);
      if (!res.ok) return;
      const { comments: all } = await res.json();
      if (!all?.length) return;

      type ApiComment = {
        id: string;
        content: string;
        status: string;
        created_at: string;
        user_id: string;
        is_own: boolean;
        is_public_consent: boolean;
        display_name: string | null;
        avatar_url: string | null;
        parent_id: string | null;
      };

      // Only top-level comments (parent_id === null) belong in the user's own chat
      // stream. Admin replies the current user authored to *other* people also
      // have is_own=true (same user_id) but must not appear here.
      const own: ApiComment[] = all.filter((c: ApiComment) => c.is_own && c.parent_id === null);
      const ownIds = new Set(own.map((c: ApiComment) => c.id));

      // Approved admin/instructor replies to the user's own comments
      const adminReplies: ApiComment[] = all.filter(
        (c: ApiComment) =>
          !c.is_own &&
          c.parent_id !== null &&
          ownIds.has(c.parent_id) &&
          c.status === 'approved',
      );

      // Merge own + admin replies and sort chronologically
      const toInjectIntoChat = [...own, ...adminReplies].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      // Inject into chat stream
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs: ChatMessage[] = toInjectIntoChat
          .filter(c => !existingIds.has(c.id))
          .map(c => {
            const isAdminReply = !c.is_own;
            return {
              id: c.id,
              role: isAdminReply ? ('system' as const) : ('user' as const),
              content: c.content,   // never pollute content with status text
              type: 'text' as const,
              timestamp: new Date(c.created_at),
              avatarUrl:   isAdminReply ? '/logo.webp' : (c.avatar_url ?? null),
              displayName: isAdminReply ? null : (c.display_name ?? null),
              isReply:     isAdminReply,
              status:      c.is_own
                ? (c.status as 'pending' | 'approved' | 'rejected')
                : undefined,
            };
          });
        return [...prev, ...newMsgs];
      });

      // Others' approved + public top-level questions → community drawer
      const community: ApiComment[] = all.filter(
        (c: ApiComment) =>
          !c.is_own &&
          c.status === 'approved' &&
          c.is_public_consent &&
          c.parent_id === null,
      );
      setCommunityComments(community.map(c => ({
        id: c.id,
        content: c.content,
        display_name: c.display_name,
        avatar_url: c.avatar_url,
        created_at: c.created_at,
      })));
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
    addMessage({
      id: tempId, role: 'user', content: text, type: 'text', timestamp: new Date(),
      status: 'pending',
      avatarUrl: null,   // will be populated on next loadComments
      displayName: null,
    });

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic_id: lesson.topic_id,
          course_id: courseSlug,
          lesson_id: lessonSlug,
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
    <div className="flex flex-col h-full" dir="rtl">
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
        <div
          className="border-t flex-shrink-0 px-4 py-3 space-y-2"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
        >
          <div className="max-w-2xl mx-auto w-full space-y-2">
            {/* Community Q&A button — show as soon as community data is loaded */}
            {communityComments.length > 0 && (
              <button
                onClick={() => setShowCommunity(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl text-sm font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
                style={{
                  backgroundColor: '#6c63ff12',
                  color: '#6c63ff',
                  border: '1px solid #6c63ff30',
                }}
              >
                <Users size={15} />
                مشاهده پرسش و پاسخ‌های سایر دانشجویان
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                  style={{ backgroundColor: '#6c63ff' }}
                >
                  {communityComments.length}
                </span>
              </button>
            )}

            {/* Chat input */}
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

            <label className="flex items-center gap-2 cursor-pointer px-1">
              <input
                type="checkbox"
                checked={isOptOut}
                onChange={e => setIsOptOut(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#6c63ff' }}
              />
              <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                نمی‌خواهم این سوال/نظر به‌صورت عمومی نمایش داده شود
              </span>
            </label>

            {sendError && (
              <div
                className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs"
                style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}
              >
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

      {/* ── Community Q&A Drawer ─────────────────────────────────────────── */}
      {showCommunity && (
        <div className="fixed inset-0 z-50 flex" dir="rtl">
          {/* Backdrop */}
          <div className="flex-1 bg-black/30" onClick={() => setShowCommunity(false)} />
          {/* Panel — slides in from the right */}
          <div
            className="w-96 max-w-full h-full flex flex-col shadow-2xl"
            style={{ backgroundColor: 'var(--color-sidebar)', borderLeft: '1px solid var(--color-border)' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div className="flex items-center gap-2">
                <MessageCircle size={16} style={{ color: '#6c63ff' }} />
                <h2 className="font-bold text-sm">پرسش و پاسخ دانشجویان</h2>
              </div>
              <button
                onClick={() => setShowCommunity(false)}
                className="p-1.5 rounded-lg hover:bg-[var(--color-muted)] transition-colors"
              >
                <X size={16} style={{ color: 'var(--color-muted-foreground)' }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {communityComments.length === 0 ? (
                <p
                  className="text-sm text-center py-10"
                  style={{ color: 'var(--color-muted-foreground)' }}
                >
                  هنوز سوال عمومی ثبت نشده
                </p>
              ) : (
                communityComments.map(c => (
                  <div
                    key={c.id}
                    className="rounded-2xl px-4 py-3 space-y-2"
                    style={{ backgroundColor: 'var(--color-muted)' }}
                  >
                    {/* Avatar row */}
                    <div className="flex items-center gap-2">
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt={c.display_name ?? ''}
                          className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: '#6c63ff' }}
                        >
                          {(c.display_name?.[0] ?? '؟').toUpperCase()}
                        </div>
                      )}
                      <p className="text-xs font-semibold" style={{ color: '#6c63ff' }}>
                        {c.display_name ?? 'دانش‌آموز'}
                      </p>
                      <p className="text-xs mr-auto" style={{ color: 'var(--color-muted-foreground)' }}>
                        {new Date(c.created_at).toLocaleDateString('fa-IR', {
                          month: 'short', day: 'numeric',
                        })}
                      </p>
                    </div>
                    <p className="text-sm leading-relaxed">{c.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
