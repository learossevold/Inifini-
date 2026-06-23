import { Story, Category, CATEGORIES } from './types';
import { RSS_SOURCES } from '@/config/sources';

const CATEGORY_PRIORITY: Record<string, number> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.priority]));

function trustFor(domain: string): number {
  return RSS_SOURCES.find((s) => s.domain === domain)?.trust_level ?? 60;
}

function recencyScore(publishedAt: string): number {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 3600_000;
  if (hours < 0) return 100;
  return 100 * Math.pow(0.5, hours / 12);
}

export function scoreStory(story: Story, selected: Category | 'top' = 'top'): number {
  const recency = recencyScore(story.published_at);
  const interestBoost = selected !== 'top' && story.category === selected ? 25 : 0;
  const breakingBoost = story.importance_score >= 80 && recency > 60 ? 30 : 0;
  return (
    recency * 0.3 + story.importance_score * 0.28 + story.novelty_score * 0.1 +
    (CATEGORY_PRIORITY[story.category] ?? 30) * 0.12 + trustFor(story.source_domain) * 0.08 +
    story.relevance_score * 0.12 + interestBoost + breakingBoost
  );
}

/** News tab: all categories. Following tab: filter to interests, but keep urgent breaking news. */
export function rankStories(stories: Story[], interests: Category[] = [], onlyInterests = false): Story[] {
  let pool = stories;
  if (onlyInterests && interests.length) {
    pool = stories.filter(
      (s) => interests.includes(s.category) || (s.importance_score >= 85 && recencyScore(s.published_at) > 50)
    );
  }
  const primary = interests[0] ?? 'top';
  return [...pool].sort((a, b) => scoreStory(b, primary) - scoreStory(a, primary));
}

export function pickBreaking(stories: Story[], limit = 8): Story[] {
  return [...stories]
    .filter((s) => recencyScore(s.published_at) > 25)
    .sort((a, b) => (b.importance_score * 0.6 + recencyScore(b.published_at) * 0.4) - (a.importance_score * 0.6 + recencyScore(a.published_at) * 0.4))
    .slice(0, limit);
}

export function readingTimeMinutes(story: Story): number {
  const words = `${story.ai_medium_summary} ${story.ai_why_it_matters} ${story.ai_key_points.join(' ')} ${story.ai_background} ${story.ai_what_next}`.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}
