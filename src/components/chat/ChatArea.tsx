'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { ChatMessage } from '@/types';
import ChatBubble from './ChatBubble';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatAreaProps {
  messages: ChatMessage[];
  onQuizAnswer: (messageId: string, selectedIndex: number) => void;
  onNextLesson: (url: string | null | undefined) => void;
  onFileUpload: (file: File) => void;
  isStreaming: boolean;
}

export default function ChatArea({
  messages,
  onQuizAnswer,
  onNextLesson,
  onFileUpload,
  isStreaming,
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isAutoScrollPausedRef = useRef(false);

  // Detect manual upward scroll → pause auto-scroll
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // Consider "at bottom" if within 80px of the end
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    isAutoScrollPausedRef.current = !atBottom;
  }, []);

  // When a new message arrives or streaming updates, scroll only if not paused
  useEffect(() => {
    if (!isAutoScrollPausedRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // When streaming ends, reset pause so next lesson auto-scrolls from top
  useEffect(() => {
    if (!isStreaming) {
      isAutoScrollPausedRef.current = false;
    }
  }, [isStreaming]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      style={{ backgroundColor: 'var(--color-chat-bg)' }}
    >
      <div className="max-w-2xl mx-auto w-full space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <ChatBubble
                message={message}
                onQuizAnswer={onQuizAnswer}
                onNextLesson={onNextLesson}
                onFileUpload={onFileUpload}
                isStreaming={isStreaming && message === messages[messages.length - 1]}
              />
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages.length === 0 && (
          <div className="flex items-center gap-2 py-4">
            <TypingIndicator />
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 px-4 py-3 rounded-2xl rounded-tr-sm"
      style={{ backgroundColor: 'var(--color-bubble-system)' }}
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: 'var(--color-muted-foreground)' }}
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
