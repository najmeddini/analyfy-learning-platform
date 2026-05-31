'use client';

import { useMemo } from 'react';

interface LessonContentProps {
  content: string;
}

export default function LessonContent({ content }: LessonContentProps) {
  const html = useMemo(() => parseMarkdown(content), [content]);
  return (
    <div
      className="lesson-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/**
 * Minimal Markdown → HTML parser for lesson content.
 * Handles: headings, bold, italic, inline code, fenced code blocks, blockquotes, lists, links.
 * Quiz lines (- [x] / - [ ]) are stripped here — the caller converts them to QuizData before rendering.
 */
function parseMarkdown(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inCode = false;
  let codeLang = '';
  let codeBuffer: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;

  function flushList() {
    if (inList && listType) {
      result.push(`</${listType}>`);
      inList = false;
      listType = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code blocks
    if (line.startsWith('```')) {
      if (!inCode) {
        flushList();
        inCode = true;
        codeLang = line.slice(3).trim();
        codeBuffer = [];
      } else {
        inCode = false;
        const escaped = codeBuffer.join('\n').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        result.push(`<pre><code class="language-${codeLang}">${escaped}</code></pre>`);
        codeBuffer = [];
        codeLang = '';
      }
      continue;
    }

    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,3})\s(.+)/);
    if (headingMatch) {
      flushList();
      const level = headingMatch[1].length;
      result.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      flushList();
      result.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^\d+\.\s(.+)/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        result.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      result.push(`<li>${inlineFormat(olMatch[1])}</li>`);
      continue;
    }

    // Unordered list (skip quiz lines)
    const ulMatch = line.match(/^[-*]\s(?!\[[ x]\])(.+)/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        result.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      result.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      result.push('');
      continue;
    }

    // Paragraph
    flushList();
    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  flushList();
  return result.join('\n');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" class="underline" style="color:#6c63ff">$1</a>');
}
