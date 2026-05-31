'use client';

import type { QuizQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface QuizWidgetProps {
  messageId: string;
  quiz: QuizQuestion;
  onAnswer: (messageId: string, selectedIndex: number) => void;
}

export default function QuizWidget({ messageId, quiz, onAnswer }: QuizWidgetProps) {
  return (
    <div className="flex flex-col gap-2 pr-10">
      {quiz.options.map((option, index) => {
        const isSelected = quiz.selectedIndex === index;
        const isAnswered = quiz.answered;
        const isCorrect = option.isCorrect;

        let bg = 'var(--color-muted)';
        let border = 'var(--color-border)';
        let textColor = 'var(--foreground)';

        if (isAnswered) {
          if (isCorrect) {
            bg = '#22c55e18';
            border = '#22c55e';
            textColor = '#16a34a';
          } else if (isSelected && !isCorrect) {
            bg = '#ef444418';
            border = '#ef4444';
            textColor = '#dc2626';
          }
        } else if (isSelected) {
          bg = '#6c63ff18';
          border = '#6c63ff';
        }

        return (
          <motion.button
            key={index}
            whileHover={!isAnswered ? { scale: 1.01 } : {}}
            whileTap={!isAnswered ? { scale: 0.99 } : {}}
            onClick={() => !isAnswered && onAnswer(messageId, index)}
            disabled={isAnswered}
            className="flex items-center gap-3 w-full text-right px-4 py-3 rounded-2xl border text-sm font-medium transition-colors disabled:cursor-default"
            style={{ backgroundColor: bg, borderColor: border, color: textColor }}
          >
            <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs flex-shrink-0" style={{ borderColor: border }}>
              {isAnswered && isCorrect ? (
                <CheckCircle size={14} />
              ) : isAnswered && isSelected && !isCorrect ? (
                <XCircle size={14} />
              ) : (
                <span>{['الف', 'ب', 'ج', 'د'][index]}</span>
              )}
            </span>
            {option.text}
          </motion.button>
        );
      })}
    </div>
  );
}
