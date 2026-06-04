'use client';

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import QuizWidget from './QuizWidget';
import FileUploadWidget from './FileUploadWidget';
import LessonContent from './LessonContent';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatBubbleProps {
  message: ChatMessage;
  onQuizAnswer: (messageId: string, selectedIndex: number) => void;
  onNextLesson: (url: string | null | undefined) => void;
  onFileUpload: (file: File) => void;
  isStreaming: boolean;
}

/** Extract up to two initials from a display name */
function getInitials(name: string | null | undefined): string {
  if (!name?.trim()) return '؟';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name[0].toUpperCase();
}

/**
 * Render user-submitted text safely as plain text — NO links, NO HTML.
 * Any URL a user types stays as an un-clickable string (anti-spam).
 * Preserves newlines via white-space: pre-wrap.
 */
function PlainUserText({ text }: { text: string }) {
  return (
    <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {text}
    </span>
  );
}

export default function ChatBubble({
  message,
  onQuizAnswer,
  onNextLesson,
  onFileUpload,
  isStreaming,
}: ChatBubbleProps) {
  const isSystem = message.role === 'system';

  // ── Quiz ──────────────────────────────────────────────────────────
  if (message.type === 'quiz' && message.quizData) {
    return (
      <div className="flex flex-col gap-3">
        <SystemBubble isStreaming={false}>
          <p className="font-medium">{message.quizData.question}</p>
        </SystemBubble>
        <QuizWidget
          messageId={message.id}
          quiz={message.quizData}
          onAnswer={onQuizAnswer}
        />
      </div>
    );
  }

  // ── Next-lesson button ────────────────────────────────────────────
  if (message.type === 'next-button') {
    const isLast = message.nextLessonUrl === null;
    return (
      <div className="flex justify-center py-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => onNextLesson(message.nextLessonUrl)}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-white font-bold text-sm transition-colors"
          style={{ backgroundColor: isLast ? '#22c55e' : '#6c63ff' }}
        >
          {isLast ? '🎉 پایان دوره' : 'درس بعدی'}
          {!isLast && <ChevronLeft size={16} />}
        </motion.button>
      </div>
    );
  }

  // ── File-upload prompt ────────────────────────────────────────────
  if (message.type === 'file-upload') {
    return (
      <div className="flex flex-col gap-2">
        <SystemBubble isStreaming={false}>
          <p>{message.content}</p>
        </SystemBubble>
        <FileUploadWidget onUpload={onFileUpload} />
      </div>
    );
  }

  // ── System / admin-reply text ─────────────────────────────────────
  // ALL role='system' messages go through SystemBubble which FORCES /logo.webp.
  // Admin replies (isReply=true) additionally get indentation + branded badge.
  // URLs in system content are clickable (instructor-authored, trusted).
  if (isSystem) {
    return (
      <SystemBubble isStreaming={isStreaming} isReply={!!message.isReply}>
        <LessonContent content={message.content} />
      </SystemBubble>
    );
  }

  // ── User text bubble (own comment) ───────────────────────────────
  // Anti-spam: content rendered via PlainUserText (NO dangerouslySetInnerHTML,
  // NO markdown link parsing — URLs stay as inert plain text).
  return (
    <div className={cn('flex flex-col items-start gap-1', message.isReply && 'mr-10')}>
      <div className="flex items-start gap-2">
        {/* Avatar: profile image → onError → initials circle */}
        <UserAvatar avatarUrl={message.avatarUrl} displayName={message.displayName} />

        {/* Bubble — plain text only, no HTML, no links (anti-spam) */}
        <div
          className={cn(
            'max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-white text-sm leading-relaxed',
            message.isReply ? 'rounded-tr-sm opacity-90' : 'rounded-tr-sm',
          )}
          style={{ backgroundColor: message.isReply ? '#8b7cf8' : '#6c63ff' }}
        >
          <PlainUserText text={message.content} />
        </div>
      </div>

      {/* Pending indicator — shown BELOW the bubble row, never inside the text */}
      {message.status === 'pending' && (
        <span className="text-xs text-slate-400 mr-9 mt-0.5 select-none">
          در انتظار تأیید...
        </span>
      )}
    </div>
  );
}

/** Avatar for user messages: image with initials fallback */
function UserAvatar({
  avatarUrl,
  displayName,
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
}) {
  if (avatarUrl) {
    return (
      <div className="relative flex-shrink-0 mt-0.5">
        <img
          src={avatarUrl}
          alt={displayName ?? ''}
          className="w-7 h-7 rounded-full object-cover border border-slate-200"
          onError={e => {
            const el = e.currentTarget as HTMLImageElement;
            el.style.display = 'none';
            const fallback = el.nextElementSibling as HTMLElement | null;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
        {/* Fallback shown by onError */}
        <div
          className="w-7 h-7 rounded-full items-center justify-center text-white text-xs font-bold select-none hidden"
          style={{ backgroundColor: '#6c63ff' }}
        >
          {getInitials(displayName)}
        </div>
      </div>
    );
  }
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 select-none"
      style={{ backgroundColor: '#6c63ff' }}
    >
      {getInitials(displayName)}
    </div>
  );
}

/**
 * System message bubble.
 * - Always uses /logo.webp (never the admin's personal avatar).
 * - isReply=true: indented, branded "پشتیبانی آنالیفای" label, lighter bg.
 * - URLs in content are clickable (instructor-authored content is trusted).
 */
function SystemBubble({
  children,
  isStreaming,
  isReply = false,
}: {
  children: React.ReactNode;
  isStreaming: boolean;
  isReply?: boolean;
}) {
  return (
    <div className={cn('flex items-start gap-3', isReply && 'mr-10')}>
      {/* /logo.webp — FORCED for all system/AI messages, never avatar_url */}
      <img
        src="/logo.webp"
        alt="آکادمی آنالیفای"
        className="w-7 h-7 rounded-full object-cover border border-slate-200 flex-shrink-0 mt-0.5"
      />

      <div
        className={cn(
          'flex-1 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-2xl',
          isReply && 'border-r-2 border-indigo-300',
          isStreaming && 'typing-cursor',
        )}
        style={{ backgroundColor: isReply ? '#eef2ff' : 'var(--color-bubble-system)' }}
      >
        {/* Admin-reply branding — displayed above the reply text */}
        {isReply && (
          <div className="flex items-center gap-1.5 mb-2">
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: '#6c63ff' }}
            >
              پشتیبانی آنالیفای
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
