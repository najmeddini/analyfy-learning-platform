import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .trim();
}

export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('fa-IR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(dateString));
}

/**
 * Build a route slug: "{title-slug}-{5-char-prefix-of-notionId}"
 * Example: "python-basics-370a8"
 * The 5-char prefix is the first 5 hex chars of the UUID (hyphens stripped).
 */
export function makeRouteSlug(title: string, notionId: string): string {
  const hash5 = notionId.replace(/-/g, '').slice(0, 5);
  return `${slugify(title)}-${hash5}`;
}

/**
 * Extract the 5-char hash from a route slug.
 * e.g. "python-basics-370a8" → "370a8"
 */
export function extractSlugHash(routeSlug: string): string {
  return routeSlug.slice(-5);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '۰ بایت';
  const k = 1024;
  const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
