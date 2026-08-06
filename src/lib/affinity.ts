import { SupabaseClient } from '@supabase/supabase-js';
import { RSS_SOURCES } from '@/config/sources';
import { CATEGORIES, Category, Story } from './types';

export interface Affinity {
  categories: Partial<Record<Category, number>>;
  sources: Record<string, number>;
}

/** Display-ready version of the same signal, for the AI Editor panel. */
export interface EditorProfile {
  categories: { id: Category; label: string; score: number }[];
  sources: { domain: string; name: string; score: number }[];
  /** How many recorded actions the profile is built from. */
  totalSignals: number;
  /** Of those, the deliberate ones (saved, liked, shared, commented). */
  deliberateSignals: number;
}

const EMPTY: Affinity = { categories: {}, sources: {} };
const EMPTY_PROFILE: EditorProfile = { categories: [], sources: [], totalSignals: 0, deliberateSignals: 0 };

/**
 * Weight per action, by how much of a deliberate choice it represents.
 * Opening something is the weakest evidence — plenty of things get opened and
 * abandoned — while saving or passing a story to a friend is an explicit
 * endorsement. (Whether a story was actually *read to the end* would be a
 * stronger signal still, but nothing records reading depth yet, so this
 * deliberately does not pretend to know it.)
 */
const WEIGHTS = { views: 1, saves: 3, likes: 2, shares: 3, comments: 2 } as const;

type SignalRows = Record<keyof typeof WEIGHTS, { story_id: string }[]>;

/**
 * Every signal this reader has generated, plus the category/source of each
 * story involved.
 *
 * `db` is passed in rather than created here because this runs from two
 * places with two different clients: the feed API uses the service-role
 * client after verifying the caller's token, while the profile screen uses
 * the reader's own browser session. Every table read below is protected by a
 * row-level-security policy scoped to `auth.uid()`, so the browser path can
 * only ever see the caller's own rows — the personalisation cannot be made
 * to describe somebody else by passing a different id.
 *
 * Story rows are fetched separately and stitched in by id (rather than a
 * PostgREST embedded join), matching how social.ts already reaches `stories`
 * from a related table.
 */
async function collectSignals(db: SupabaseClient, userId: string): Promise<{ rows: SignalRows; lookup: Map<string, { category: Category; source_domain: string }> }> {
  const [views, saves, likes, shares, comments] = await Promise.all([
    db.from('story_views').select('story_id').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(150),
    db.from('story_saves').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('story_likes').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('shared_stories').select('story_id').eq('from_user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('comments').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
  ]);

  const rows: SignalRows = {
    views: (views.data as any[]) ?? [],
    saves: (saves.data as any[]) ?? [],
    likes: (likes.data as any[]) ?? [],
    shares: (shares.data as any[]) ?? [],
    comments: (comments.data as any[]) ?? [],
  };

  const allIds = new Set<string>();
  for (const list of Object.values(rows)) for (const r of list) if (r.story_id) allIds.add(r.story_id);

  const lookup = new Map<string, { category: Category; source_domain: string }>();
  if (allIds.size > 0) {
    const { data } = await db.from('stories').select('id, category, source_domain').in('id', Array.from(allIds));
    for (const s of (data as any[]) ?? []) lookup.set(s.id, s);
  }
  return { rows, lookup };
}

/** Raw weighted totals per category and per source domain. */
function tally(rows: SignalRows, lookup: Map<string, { category: Category; source_domain: string }>) {
  const categories: Record<string, number> = {};
  const sources: Record<string, number> = {};
  let totalSignals = 0;
  let deliberateSignals = 0;

  for (const [kind, weight] of Object.entries(WEIGHTS) as [keyof typeof WEIGHTS, number][]) {
    for (const r of rows[kind]) {
      totalSignals += 1;
      if (kind !== 'views') deliberateSignals += 1;
      const s = lookup.get(r.story_id);
      if (!s) continue;
      if (s.category) categories[s.category] = (categories[s.category] ?? 0) + weight;
      if (s.source_domain) sources[s.source_domain] = (sources[s.source_domain] ?? 0) + weight;
    }
  }
  return { categories, sources, totalSignals, deliberateSignals };
}

/**
 * Normalised against this reader's own strongest signal, never across
 * readers: otherwise someone's very first save would swing ranking as hard
 * as another reader's hundredth, and a heavy user's raw totals would dwarf a
 * light user's if the two were ever compared.
 */
function normalize(raw: Record<string, number>): Record<string, number> {
  const max = Math.max(0, ...Object.values(raw));
  if (max === 0) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) out[k] = v / max;
  return out;
}

/** The ranking signal: what this reader engages with, as 0..1 per category/source. */
export async function getUserAffinity(db: SupabaseClient, userId: string): Promise<Affinity> {
  const { rows, lookup } = await collectSignals(db, userId);
  if (lookup.size === 0) return EMPTY;
  const { categories, sources } = tally(rows, lookup);
  return { categories: normalize(categories) as Affinity['categories'], sources: normalize(sources) };
}

/**
 * The same signal, shaped for showing the reader what has actually been
 * learned about them. Deliberately reports only what is genuinely measured:
 * which subjects and outlets their own actions point at, and how much
 * evidence that rests on.
 */
export async function getEditorProfile(db: SupabaseClient, userId: string): Promise<EditorProfile> {
  const { rows, lookup } = await collectSignals(db, userId);
  const { categories, sources, totalSignals, deliberateSignals } = tally(rows, lookup);
  if (totalSignals === 0) return EMPTY_PROFILE;

  const nCat = normalize(categories);
  const nSrc = normalize(sources);
  const pct = (v: number) => Math.round(v * 100);

  return {
    categories: Object.entries(nCat)
      .map(([id, v]) => ({
        id: id as Category,
        label: CATEGORIES.find((c) => c.id === id)?.label ?? id,
        score: pct(v),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5),
    sources: Object.entries(nSrc)
      .map(([domain, v]) => ({
        domain,
        name: RSS_SOURCES.find((s) => s.domain === domain)?.name ?? domain,
        score: pct(v),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3),
    totalSignals,
    deliberateSignals,
  };
}

/**
 * A one-line reason a given story is showing up in Explore, in the reader's
 * own terms — "recommended because you read a lot about AI", not "algorithm
 * score 0.83". This is a template filled from the same numbers the ranking
 * boost already uses, not a separate AI-written sentence: there's no
 * per-view generation cost, and it can never claim something the profile
 * doesn't actually show, because it's built from the identical data.
 *
 * Returns null when there's nothing honest to say — a story that only
 * matches a followed topic/source at the default weight, with no real
 * behavioural signal behind it, gets no manufactured explanation.
 */
export function explainRecommendation(story: Story, profile: EditorProfile): string | null {
  const category = profile.categories.find((c) => c.id === story.category);
  const source = profile.sources.find((s) => s.domain === story.source_domain);

  // Prefer whichever signal is actually stronger, category or source, so
  // the explanation always names the more accurate reason. A tie goes to
  // category — "you read about X" says more than "you trust Y" when both
  // are equally true.
  const strongest = [category, source].filter(Boolean).sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0))[0];
  if (!strongest) return null;

  const MIN_SCORE = 35; // below this, the signal is too thin to state as a reason with any confidence
  if (strongest.score < MIN_SCORE) return null;

  if (strongest === category) {
    // Most category labels (Technology, Science, Sport, ...) are common
    // nouns and read naturally lowercased mid-sentence. "Norway" and "AI"
    // aren't — a proper noun and an acronym stay exactly as labelled, or
    // "you read about norway" reads like a typo and "you read about ai"
    // loses the acronym entirely.
    const KEEP_CASE: Category[] = ['norway', 'ai'];
    const label = KEEP_CASE.includes(category!.id) ? category!.label : category!.label.toLowerCase();
    return category!.score >= 70
      ? `Recommended because you often read about ${label}.`
      : `Recommended because you've shown interest in ${label}.`;
  }
  return `Recommended because you tend to trust ${source!.name}.`;
}

/**
 * Clears the passive half of the profile: which stories were opened.
 *
 * Scoped to story_views on purpose. Saves, likes, comments and shares are
 * things the reader deliberately made and can see in their own profile —
 * silently deleting them to reset a recommendation model would destroy
 * content they own and never asked to lose. The UI says so plainly rather
 * than implying this wipes everything.
 */
export async function clearReadingHistory(db: SupabaseClient, userId: string): Promise<void> {
  await db.from('story_views').delete().eq('user_id', userId);
}
