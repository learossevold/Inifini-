import { Story, Category, CATEGORIES } from './types';
import { RSS_SOURCES } from '@/config/sources';
import { Affinity } from './affinity';

const CATEGORY_PRIORITY: Record<string, number> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.priority]));

function trustFor(domain: string): number {
  return RSS_SOURCES.find((s) => s.domain === domain)?.trust_level ?? 60;
}

function recencyScore(publishedAt: string): number {
  const hours = (Date.now() - new Date(publishedAt).getTime()) / 3600_000;
  if (hours < 0) return 100;
  return 100 * Math.pow(0.5, hours / 12);
}

/**
 * recencyScore halves every 12 hours, so by day four it is indistinguishable
 * from zero: past that point two stories a month apart scored the same on
 * recency and importance alone decided the order. That is how a three-week-old
 * story ended up above this morning's news.
 *
 * The penalty grows with age instead of bottoming out, so old stories sink.
 * It is capped rather than disqualifying: if ingestion ever stalls, a stale
 * feed is still better than an empty one.
 */
function agePenalty(publishedAt: string): number {
  const days = (Date.now() - new Date(publishedAt).getTime()) / 86_400_000;
  if (days <= 2) return 0;
  return Math.min(60, (days - 2) * 6);
}

export function scoreStory(story: Story, selected: Category | 'top' = 'top', affinity?: Affinity): number {
  const recency = recencyScore(story.published_at);
  const interestBoost = selected !== 'top' && story.category === selected ? 25 : 0;
  const breakingBoost = story.importance_score >= 80 && recency > 60 ? 30 : 0;
  // Learned on top of the declared interest, not instead of it: onboarding
  // picks are still the starting point (interestBoost above), and actual
  // engagement — already normalised to this one user's own 0..1 scale in
  // getUserAffinity — nudges the order further from there as a history
  // builds up. A category or source with no engagement yet contributes
  // nothing, so a brand-new account ranks exactly as it did before this.
  const categoryAffinityBoost = (affinity?.categories[story.category] ?? 0) * 20;
  const sourceAffinityBoost = (affinity?.sources[story.source_domain] ?? 0) * 10;
  return (
    recency * 0.3 + story.importance_score * 0.28 + story.novelty_score * 0.1 +
    (CATEGORY_PRIORITY[story.category] ?? 30) * 0.12 + trustFor(story.source_domain) * 0.08 +
    story.relevance_score * 0.12 + interestBoost + breakingBoost + categoryAffinityBoost + sourceAffinityBoost - agePenalty(story.published_at)
  );
}

/**
 * News tab: all categories, no personal signal — same feed for everyone,
 * on purpose (see the "News vs Explore" split: News is where "if something
 * important happens, you'll find it here" has to hold regardless of what
 * anyone reads). Following/Explore tab: filter to followed interests and/or
 * sources, then let actual engagement history further shape the order
 * within that — but keep urgent breaking news regardless, whatever anyone
 * happens to read.
 */
export function rankStories(stories: Story[], interests: Category[] = [], onlyInterests = false, followedSources: string[] = [], affinity?: Affinity): Story[] {
  let pool = stories;
  if (onlyInterests && (interests.length || followedSources.length)) {
    pool = stories.filter(
      (s) => interests.includes(s.category) || followedSources.includes(s.source_domain) ||
        (s.importance_score >= 85 && recencyScore(s.published_at) > 50)
    );
  }
  const primary = interests[0] ?? 'top';
  const useAffinity = onlyInterests ? affinity : undefined; // News never gets a personal boost
  return [...pool].sort((a, b) => scoreStory(b, primary, useAffinity) - scoreStory(a, primary, useAffinity));
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
