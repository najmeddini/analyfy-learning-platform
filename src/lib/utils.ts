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
 * Build a hierarchical route slug: "{title-slug}-{uuid-without-hyphens}"
 * Example: "python-basics-370a8ae8f850803cbb52000b12a3d7af"
 */
export function makeRouteSlug(title: string, notionId: string): string {
  return `${slugify(title)}-${notionId.replace(/-/g, '')}`;
}

/**
 * Reconstruct Notion UUID from a route slug.
 * Strips all hyphens, takes last 32 chars (the UUID), re-inserts hyphens.
 */
export function extractNotionId(routeSlug: string): string {
  const flat = routeSlug.replace(/-/g, '');
  const hex = flat.slice(-32);
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '۰ بایت';
  const k = 1024;
  const sizes = ['بایت', 'کیلوبایت', 'مگابایت', 'گیگابایت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
