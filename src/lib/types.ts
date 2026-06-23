// Core content + social model for Inifini — mirrors supabase/schema.sql

export type Category =
  | 'top' | 'local' | 'norway' | 'world' | 'politics' | 'business'
  | 'technology' | 'ai' | 'science' | 'health' | 'culture' | 'sport'
  | 'design' | 'art' | 'travel';

export const CATEGORIES: { id: Category; label: string; priority: number }[] = [
  { id: 'top', label: 'Top Stories', priority: 100 },
  { id: 'local', label: 'Local', priority: 95 },
  { id: 'norway', label: 'Norway', priority: 90 },
  { id: 'world', label: 'World', priority: 85 },
  { id: 'politics', label: 'Politics', priority: 80 },
  { id: 'business', label: 'Business', priority: 70 },
  { id: 'technology', label: 'Technology', priority: 65 },
  { id: 'ai', label: 'AI', priority: 60 },
  { id: 'science', label: 'Science', priority: 55 },
  { id: 'health', label: 'Health', priority: 50 },
  { id: 'culture', label: 'Culture', priority: 40 },
  { id: 'sport', label: 'Sport', priority: 35 },
  { id: 'design', label: 'Design', priority: 30 },
  { id: 'art', label: 'Art', priority: 25 },
  { id: 'travel', label: 'Travel', priority: 20 },
];

export type VideoStatus = 'none' | 'queued' | 'ready' | 'failed';

export interface Story {
  id: string;
  title: string;
  slug: string;
  original_url: string;
  source_name: string;
  source_domain: string;
  category: Category;
  region: string;
  language: string;
  published_at: string;
  fetched_at: string;
  image_url: string | null;
  original_excerpt: string;
  ai_short_summary: string;
  ai_medium_summary: string;
  ai_why_it_matters: string;
  ai_key_points: string[];
  ai_background: string;
  ai_what_next: string;
  importance_score: number;
  novelty_score: number;
  relevance_score: number;
  status: 'published' | 'pending' | 'hidden';
  is_demo: boolean;
  // Watch tab
  video_url: string | null;
  video_status: VideoStatus;
  video_duration_seconds: number | null;
  // Engagement (denormalized totals for display)
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  story_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
  hidden: boolean;
  // joined for display
  author?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>;
  like_count?: number;
  liked_by_me?: boolean;
  replies?: Comment[];
}

export interface Friendship {
  id: string;
  user_id_1: string;
  user_id_2: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface SharedStory {
  id: string;
  story_id: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
  read: boolean;
  story?: Story;
  from?: Pick<Profile, 'username' | 'display_name' | 'avatar_url'>;
}

export interface Source {
  id: string;
  name: string;
  rss_url: string;
  domain: string;
  language: string;
  region: string;
  category: Category;
  trust_level: number;
  active: boolean;
}

export type FeedTab = 'news' | 'following' | 'watch';

export interface FeedResponse {
  stories: Story[];
  breaking: Story[];
  page: number;
  hasMore: boolean;
  mode: 'live' | 'mock';
}
