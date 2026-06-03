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
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef    = useRef<HTMLDivElement>(null);

  // True when user is close enough to the bottom that we should follow.
  // Stored in a ref so reads/writes never cause re-renders.
  const shouldFollowRef = useRef(true);

  // ── Scroll helper: instant jump, never animates ──────────────────
  const scrollToBottom = useCallback(() => {
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // ── onScroll: user moved the container manually ──────────────────
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    // 100 px grace zone — if within it, re-engage auto-follow
    shouldFollowRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  // ── ResizeObserver: fires only when content height actually grows ─
  // This replaces useEffect([messages]) which fired on every render,
  // causing dozens of competing smooth-scroll animations per second.
  useEffect(() => {
    const inner = innerRef.current;
    if (!inner) return;

    const observer = new ResizeObserver(() => {
      if (shouldFollowRef.current) scrollToBottom();
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  // ── When a NEW lesson loads (streaming starts fresh), jump to top ─
  useEffect(() => {
    if (isStreaming && messages.length <= 1) {
      const el = containerRef.current;
      if (el) el.scrollTop = 0;
      shouldFollowRef.current = true;
    }
  }, [isStreaming, messages.length]);

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
      style={{ backgroundColor: 'var(--color-chat-bg)' }}
    >
      <div ref={innerRef} className="max-w-2xl mx-auto w-full space-y-4">
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
