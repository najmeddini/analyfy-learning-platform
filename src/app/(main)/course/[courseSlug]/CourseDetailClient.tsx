'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Topic, Lesson } from '@/types';
import BountyBadge from '@/components/ui/BountyBadge';
import { ChevronLeft, Lock, CheckCircle, BookOpen, Trophy } from 'lucide-react';

interface Props {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

export default function CourseDetailClient({ courseId, courseSlug, courseTitle }: Props) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [progress, setProgress] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/notion/topics?courseId=${courseId}`).then((r) => r.json()),
      fetch('/api/progress').then((r) => r.json()),
    ]).then(([topicsData, progressData]) => {
      setTopics(topicsData.topics ?? []);
      setProgress((progressData.progress ?? []).map((p: { lesson_id: string }) => p.lesson_id));
      setLoading(false);
    });
  }, [courseId]);

  async function toggleTopic(topicId: string) {
    if (expandedTopic === topicId) { setExpandedTopic(null); return; }
    setExpandedTopic(topicId);
    if (!lessons[topicId]) {
      const res = await fetch(`/api/notion/lessons?topicId=${topicId}`);
      const { lessons: ls } = await res.json();
      setLessons((prev) => ({ ...prev, [topicId]: ls ?? [] }));
    }
  }

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--color-muted)' }} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="text-sm flex items-center gap-1 hover:underline"
          style={{ color: 'var(--color-muted-foreground)' }}
        >
          ← بازگشت
        </button>

        <h1 className="text-xl font-bold">{courseTitle}</h1>

        <div className="space-y-3">
          {topics.map((topic, idx) => {
            const topicLessons = lessons[topic.id] ?? [];
            const completedCount = topicLessons.filter((l) => progress.includes(l.id)).length;
            const isExpanded = expandedTopic === topic.id;
            const isLocked = idx > 0 && (() => {
              const prev = topics[idx - 1];
              const prevLessons = lessons[prev.id] ?? [];
              return prevLessons.length > 0 && prevLessons.some((l) => !progress.includes(l.id));
            })();

            return (
              <div key={topic.id} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)' }}>
                <button
                  onClick={() => !isLocked && toggleTopic(topic.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-right hover:bg-[var(--color-muted)] transition-colors"
                  disabled={isLocked}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: isLocked ? 'var(--color-muted)' : '#6c63ff18',
                      color: isLocked ? 'var(--color-muted-foreground)' : '#6c63ff',
                    }}
                  >
                    {isLocked ? <Lock size={14} /> : idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${isLocked ? 'opacity-50' : ''}`}>{topic.title}</p>
                      {topic.is_bounty_project && <Trophy size={13} style={{ color: '#f59e0b' }} />}
                    </div>
                    {topicLessons.length > 0 && (
                      <p className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                        {completedCount}/{topicLessons.length} درس تکمیل‌شده
                      </p>
                    )}
                    {topic.is_bounty_project && topic.bounty_prize > 0 && (
                      <p className="text-xs font-medium" style={{ color: '#d97706' }}>
                        🏆 جایزه {topic.bounty_prize.toLocaleString('fa-IR')} تومان
                      </p>
                    )}
                  </div>
                  {!isLocked && (
                    <ChevronLeft
                      size={16}
                      style={{
                        color: 'var(--color-muted-foreground)',
                        transform: isExpanded ? 'rotate(-90deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  )}
                </button>

                {/* Bounty detail banner */}
                {isExpanded && topic.is_bounty_project && topic.bounty_prize > 0 && (
                  <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: '#f59e0b08' }}>
                    <BountyBadge
                      prize={topic.bounty_prize}
                      sponsorName={topic.bounty_sponsor_name}
                      sponsorLogo={topic.bounty_sponsor_logo}
                      size="md"
                    />
                  </div>
                )}

                {isExpanded && (
                  <div className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    {topicLessons.length === 0 ? (
                      <p className="px-4 py-3 text-sm" style={{ color: 'var(--color-muted-foreground)' }}>در حال بارگذاری...</p>
                    ) : (
                      <ul className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
                        {topicLessons.map((lesson) => {
                          const isDone = progress.includes(lesson.id);
                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/course/${courseSlug}/lesson/${lesson.slug}`}
                                className="flex items-center gap-3 px-6 py-3 text-sm hover:bg-[var(--color-muted)] transition-colors"
                              >
                                {isDone ? (
                                  <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                                ) : (
                                  <BookOpen size={14} className="flex-shrink-0" style={{ color: 'var(--color-muted-foreground)' }} />
                                )}
                                <span className={isDone ? 'line-through opacity-60' : ''}>{lesson.title}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
