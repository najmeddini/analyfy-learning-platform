'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

interface Props {
  courseId: string;
  initialRating?: number;
  avgRating?: number;
  ratingCount?: number;
  readonly?: boolean;
  onRate?: (rating: number) => void;
}

export default function StarRating({
  courseId,
  initialRating = 0,
  avgRating = 0,
  ratingCount = 0,
  readonly = false,
  onRate,
}: Props) {
  const [hovered, setHovered] = useState(0);
  const [current, setCurrent] = useState(initialRating);
  const [saving, setSaving] = useState(false);

  const display = readonly ? avgRating : (hovered || current);

  async function handleRate(rating: number) {
    if (readonly || saving) return;
    setSaving(true);
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course_id: courseId, rating }),
      });
      if (res.ok) {
        setCurrent(rating);
        onRate?.(rating);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex items-center gap-0.5"
        onMouseLeave={() => !readonly && setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly || saving}
            onClick={() => handleRate(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110 transition-transform'}`}
            aria-label={`${star} ستاره`}
          >
            <Star
              size={readonly ? 14 : 18}
              className={display >= star ? 'fill-current' : ''}
              style={{
                color: display >= star ? '#f59e0b' : 'var(--color-border)',
              }}
            />
          </button>
        ))}
      </div>
      {readonly && ratingCount > 0 && (
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {avgRating.toFixed(1)} ({ratingCount.toLocaleString('fa-IR')})
        </span>
      )}
      {!readonly && current > 0 && (
        <span className="text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
          {current === 1 ? 'ضعیف' : current === 2 ? 'متوسط' : current === 3 ? 'خوب' : current === 4 ? 'عالی' : 'فوق‌العاده'}
        </span>
      )}
    </div>
  );
}
