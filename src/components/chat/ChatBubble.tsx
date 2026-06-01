'use client';

import { useRef } from 'react';
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

export default function ChatBubble({
  message,
  onQuizAnswer,
  onNextLesson,
  onFileUpload,
  isStreaming,
}: ChatBubbleProps) {
  const isSystem = message.role === 'system';

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

  // Standard text message
  if (isSystem) {
    return (
      <SystemBubble isStreaming={isStreaming}>
        <LessonContent content={message.content} />
      </SystemBubble>
    );
  }

  // User message
  return (
    <div className="flex justify-start">
      <div
        className="max-w-xs lg:max-w-md px-4 py-3 rounded-2xl rounded-tl-sm text-white text-sm"
        style={{ backgroundColor: '#6c63ff' }}
      >
        {message.content}
      </div>
    </div>
  );
}

function SystemBubble({
  children,
  isStreaming,
}: {
  children: React.ReactNode;
  isStreaming: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: '#6c63ff' }}
      >
        ی
      </div>
      <div
        className={cn(
          'flex-1 px-4 py-3 rounded-2xl rounded-tr-sm text-sm leading-relaxed max-w-2xl',
          isStreaming && 'typing-cursor'
        )}
        style={{ backgroundColor: 'var(--color-bubble-system)' }}
      >
        {children}
      </div>
    </div>
  );
}
