'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Lesson, Topic, ChatMessage, QuizQuestion } from '@/types';
import { nanoid } from '@/lib/nanoid';
import ChatArea from './ChatArea';
import CommentBox from './CommentBox';
import GuestTeaser from './GuestTeaser';
import BountyBadge from '../ui/BountyBadge';
import StarRating from '../ui/StarRating';
import { ArrowRight } from 'lucide-react';

interface Props {
  lesson: Lesson;
  topic: Topic | null;
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

  // Question is everything before the first option line
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

export default function LessonChatShell({ lesson, topic, user, isBot, isAlreadyCompleted }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [lessonDone, setLessonDone] = useState(isAlreadyCompleted);
  const [userRating, setUserRating] = useState(0);
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

    // Prefer rich HTML content from Notion page blocks; fall back to plain content
    const displayContent = lesson.html_content?.trim() || lesson.content;

    const msgId = nanoid();
    addMessage({ id: msgId, role: 'system', content: '', type: 'text', timestamp: new Date() });

    setIsStreaming(!skipAnimation);
    await animateText(displayContent, chunk => {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, content: chunk } : m));
    }, skipAnimation);
    setIsStreaming(false);

    // If lesson has a quiz, parse Quiz_Content (NOT embedded in main content)
    if (lesson.has_quiz && lesson.quiz_content) {
      const quiz = parseQuizContent(lesson.quiz_content);
      if (quiz) {
        addMessage({ id: nanoid(), role: 'system', content: '', type: 'quiz', quizData: quiz, timestamp: new Date() });
        return; // Wait for quiz answer before marking done
      }
    }

    // No quiz — show next button immediately
    showNextButton();
    if (!isAlreadyCompleted) await markDone();
  }

  function showNextButton() {
    addMessage({ id: nanoid(), role: 'system', content: '', type: 'next-button', timestamp: new Date() });
  }

  async function markDone() {
    setLessonDone(true); // Always update UI — guests see GuestTeaser, auth users see CommentBox
    if (!user) return;   // Guests skip the progress API call
    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lesson_id: lesson.id,
        topic_id: lesson.topic_id,
        lesson_title: lesson.title,
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
      ? '✅ عالی! پاسخ درست است. ادامه بده!'
      : `❌ پاسخ درست نیست. جواب صحیح: **${correct}**`;

    setIsStreaming(true);
    await animateText(replyText, chunk => {
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, content: chunk } : m));
    }, isBot);
    setIsStreaming(false);

    showNextButton();
    if (!isAlreadyCompleted) await markDone();
  }

  function handleNextLesson() {
    if (!user) {
      router.push('/login');
      return;
    }
    setShowComment(true);
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
      {/* Header */}
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

        {/* Star rating (for authenticated users who completed the lesson) */}
        {user && lessonDone && topic && (
          <StarRating
            courseId={topic.course_id}
            initialRating={userRating}
            onRate={setUserRating}
          />
        )}

        {topic?.is_bounty_project && (
          <BountyBadge
            prize={topic.bounty_prize}
            sponsorName={topic.bounty_sponsor_name}
            sponsorLogo={topic.bounty_sponsor_logo}
          />
        )}
        {isAlreadyCompleted && (
          <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: '#22c55e18', color: '#16a34a' }}>
            ✅ تکمیل‌شده
          </span>
        )}
      </div>

      {/* Chat content */}
      <ChatArea
        messages={messages}
        onQuizAnswer={handleQuizAnswer}
        onNextLesson={handleNextLesson}
        onFileUpload={handleFileUpload}
        isStreaming={isStreaming}
      />

      {/* Bottom: comment or guest teaser */}
      {lessonDone && !showComment && (
        user ? (
          <div
            className="px-4 py-3 border-t flex-shrink-0"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-sidebar)' }}
          >
            <button
              onClick={() => setShowComment(true)}
              className="text-sm font-medium"
              style={{ color: '#6c63ff' }}
            >
              + نظر یا بازتاب یادگیری بنویس
            </button>
          </div>
        ) : (
          <GuestTeaser topicId={lesson.topic_id} />
        )
      )}

      {showComment && user && (
        <CommentBox topicId={lesson.topic_id} onDone={() => setShowComment(false)} />
      )}
    </div>
  );
}
