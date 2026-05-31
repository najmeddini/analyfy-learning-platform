export type UserRole = 'user' | 'admin';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type ProjectStatus = 'pending' | 'approved' | 'rejected';
export type CommentStatus = 'pending' | 'approved' | 'rejected';
export type AccessType = 'Public' | 'Premium' | 'Draft';

// ─── Supabase DB Types ────────────────────────────────────────────────────────

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  org_id: string | null;
  // Public profile fields (migration 003)
  username: string | null;
  bio: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  expertise: string | null;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  admin_user_id: string;
  created_at: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  topic_id: string;
  lesson_id: string;
  lesson_title: string | null;  // cached from Notion (migration 003)
  last_reviewed: string | null; // updated on each visit (migration 003)
  completed_at: string;
}

export interface CourseRating {
  id: string;
  user_id: string;
  course_id: string;
  rating: number; // 1–5
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  topic_id: string;
  content: string;
  is_public_consent: boolean;
  status: CommentStatus;
  created_at: string;
  profiles?: Pick<Profile, 'display_name' | 'avatar_url'>;
}

export interface Project {
  id: string;
  user_id: string;
  topic_id: string;
  project_id: string | null;    // Notion Projects DB page ID (migration 003)
  file_url: string;
  status: ProjectStatus;
  is_bounty_submission: boolean;
  created_at: string;
  profiles?: Pick<Profile, 'display_name'>;
}

export interface Donation {
  id: string;
  donor_name: string;
  amount: number;
  created_at: string;
}

// ─── Notion Content Types ─────────────────────────────────────────────────────

export interface Course {
  id: string;
  title: string;
  slug: string;
  status: 'Published' | 'Draft';
  access_type: AccessType;
  cover_image: string | null;
  // Dynamic stats (from Supabase, merged on explore page)
  stats?: CourseStats;
}

export interface CourseStats {
  avg_rating: number;
  rating_count: number;
  student_count: number;
  comment_count: number;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  course_id: string;
  has_project: boolean;
  project_max_size_mb: number;
  allowed_extensions: string;
  order: number;
  // Bounty fields
  is_bounty_project: boolean;
  bounty_sponsor_name: string;
  bounty_sponsor_logo: string | null;
  bounty_prize: number;
}

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  topic_id: string;
  order: number;
  content: string;       // rich_text property fallback
  html_content: string;  // rendered from Notion page blocks (primary)
  has_quiz: boolean;
  quiz_content: string;  // separate Quiz_Content property (markdown)
}

/** A project entry from the Notion Projects DB (separate from Supabase Project) */
export interface NotionProject {
  id: string;
  title: string;
  slug: string;
  course_id: string;
  project_max_size_mb: number;
  allowed_extensions: string;
  is_bounty: boolean;
  bounty_prize: number;
  bounty_sponsor_name: string;
  html_content: string; // project instructions from page body
}

// ─── Chat UI Types ────────────────────────────────────────────────────────────

export type MessageRole = 'system' | 'user';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: 'text' | 'quiz' | 'next-button' | 'file-upload';
  quizData?: QuizQuestion;
  timestamp: Date;
}

export interface QuizOption {
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  question: string;
  options: QuizOption[];
  answered: boolean;
  selectedIndex: number | null;
}

// ─── Org Admin ───────────────────────────────────────────────────────────────

export interface EmployeeProgress {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  completed_lessons: number;
  last_activity: string | null;
}

// ─── Recent Thread (sidebar) ─────────────────────────────────────────────────

export interface RecentThread {
  lesson_id: string;
  lesson_title: string | null;
  last_reviewed: string | null;
}
