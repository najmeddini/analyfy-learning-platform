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

/** Small avatar circle: tries image, falls back to initials */
function AvatarCircle({
  avatarUrl,
  displayName,
  size = 7,
  fallbackBg = '#6c63ff',
}: {
  avatarUrl?: string | null;
  displayName?: string | null;
  size?: number;
  fallbackBg?: string;
}) {
  const dim = `w-${size} h-${size}`;
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? ''}
        className={cn(dim, 'rounded-full object-cover flex-shrink-0 mt-0.5')}
        onError={e => {
          // If image fails to load, hide and show initials circle via sibling
          (e.currentTarget as HTMLElement).style.display = 'none';
          const sib = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null;
          if (sib) sib.style.display = 'flex';
        }}
      />
    );
  }
  return (
    <div
      className={cn(dim, 'rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 select-none')}
      style={{ backgroundColor: fallbackBg }}
    >
      {getInitials(displayName)}
    </div>
  );
}

export default function ChatBubble({
  message,
  onQuizAnswer,
  onNextLesson,
  onFileUpload,
  isStreaming,
}: ChatBubbleProps) {
  // DEBUG — remove after confirming avatars render correctly
  console.log('[ChatBubble]', message.role, message.type, {
    avatarUrl: message.avatarUrl,
    displayName: message.displayName,
    isReply: message.isReply,
    id: message.id,
  });

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

  // ── System text (lesson content or admin reply) ───────────────────
  if (isSystem) {
    return (
      <SystemBubble isStreaming={isStreaming} isReply={message.isReply}>
        <LessonContent content={message.content} />
      </SystemBubble>
    );
  }

  // ── User text (own comment, optionally a reply) ───────────────────
  return (
    <div className={cn('flex items-start gap-2', message.isReply && 'mr-10')}>
      {/* Avatar: use avatar_url → fallback initials */}
      {message.avatarUrl ? (
        <>
          <img
            src={message.avatarUrl}
            alt={message.displayName ?? ''}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
            onError={e => {
              (e.currentTarget as HTMLElement).style.display = 'none';
              const sib = (e.currentTarget as HTMLElement).nextElementSibling as HTMLElement | null;
              if (sib) sib.style.display = 'flex';
            }}
          />
          {/* Hidden fallback shown by onError above */}
          <div
            className="w-7 h-7 rounded-full items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5 select-none hidden"
            style={{ backgroundColor: '#6c63ff' }}
          >
            {getInitials(message.displayName)}
          </div>
        </>
      ) : (
        <AvatarCircle displayName={message.displayName} fallbackBg="#6c63ff" />
      )}

      {/* Bubble */}
      <div
        className={cn(
          'max-w-xs lg:max-w-md px-4 py-3 rounded-2xl text-white text-sm leading-relaxed',
          message.isReply
            ? 'rounded-tr-sm border-r-2 border-white/30 text-sm opacity-90'
            : 'rounded-tr-sm',
        )}
        style={{ backgroundColor: message.isReply ? '#8b7cf8' : '#6c63ff' }}
      >
        {message.content}
      </div>
    </div>
  );
}

/** System message bubble — used for lesson content and admin replies */
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
      {/* Logo avatar — always /logo.webp for any system/AI message */}
      <img
        src="/logo.webp"
        alt="آکادمی آنالیفای"
        className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
      />

      <div
        className={cn(
          'flex-1 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-2xl',
          isReply && 'border-r-2 border-indigo-200',
          isStreaming && 'typing-cursor',
        )}
        style={{ backgroundColor: isReply ? '#f0f4ff' : 'var(--color-bubble-system)' }}
      >
        {/* Small "پاسخ" label for indented admin replies */}
        {isReply && (
          <span
            className="block text-xs font-semibold mb-1.5"
            style={{ color: '#6c63ff' }}
          >
            پاسخ مدرس
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
