import { supabaseAdmin } from './supabase';
import { Category } from './types';

export interface Affinity {
  categories: Partial<Record<Category, number>>;
  sources: Record<string, number>;
}

const EMPTY: Affinity = { categories: {}, sources: {} };

/**
 * What a signed-in user actually engages with, learned from their own
 * history rather than only asked once at onboarding — the raw material for
 * Explore's ranking boost. Every underlying signal already existed in the
 * schema (views, saves, likes, shares, comments are all recorded
 * elsewhere); this is the first place anything reads them back out for
 * ranking instead of just storing them.
 *
 * Weighted by how much intent each action implies — a view is the weakest
 * signal (you open plenty of things you don't end up caring about), a save
 * or a share is the strongest (a deliberate choice to keep or pass it on).
 *
 * Story rows are fetched separately and stitched in by id, the same way
 * social.ts's fetchStoriesByIds does it, rather than a PostgREST embedded
 * join — consistent with how the rest of this codebase already reaches
 * `stories` from a related table.
 */
export async function getUserAffinity(userId: string): Promise<Affinity> {
  const db = supabaseAdmin();
  if (!db) return EMPTY;

  const [{ data: views }, { data: saves }, { data: likes }, { data: shares }, { data: comments }] = await Promise.all([
    db.from('story_views').select('story_id').eq('user_id', userId).order('viewed_at', { ascending: false }).limit(150),
    db.from('story_saves').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('story_likes').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('shared_stories').select('story_id').eq('from_user_id', userId).order('created_at', { ascending: false }).limit(150),
    db.from('comments').select('story_id').eq('user_id', userId).order('created_at', { ascending: false }).limit(150),
  ]);

  // weight, ids — a view counts once, a save/share count for three, matching
  // how much of a deliberate choice each action represents.
  const weighted: [any[] | null, number][] = [
    [views, 1], [saves, 3], [likes, 2], [shares, 3], [comments, 2],
  ];

  const allIds = new Set<string>();
  for (const [rows] of weighted) for (const r of rows ?? []) if (r.story_id) allIds.add(r.story_id);
  if (allIds.size === 0) return EMPTY;

  const { data: storyRows } = await db.from('stories').select('id, category, source_domain').in('id', Array.from(allIds));
  const lookup = new Map<string, { category: Category; source_domain: string }>();
  for (const s of (storyRows as any[]) ?? []) lookup.set(s.id, s);

  const rawCategories: Partial<Record<Category, number>> = {};
  const rawSources: Record<string, number> = {};
  for (const [rows, weight] of weighted) {
    for (const r of rows ?? []) {
      const s = lookup.get(r.story_id);
      if (!s) continue;
      if (s.category) rawCategories[s.category] = (rawCategories[s.category] ?? 0) + weight;
      if (s.source_domain) rawSources[s.source_domain] = (rawSources[s.source_domain] ?? 0) + weight;
    }
  }

  // Normalised against the user's own biggest signal, not across users —
  // otherwise someone's very first save would swing rankings as hard as
  // another reader's hundredth engagement with the same category, and a
  // heavy user's raw totals would dwarf a light user's if this were ever
  // compared between accounts.
  const normalize = <K extends string>(raw: Record<string, number>): Record<K, number> => {
    const max = Math.max(0, ...Object.values(raw));
    if (max === 0) return {} as Record<K, number>;
    const out = {} as Record<K, number>;
    for (const [k, v] of Object.entries(raw)) out[k as K] = v / max;
    return out;
  };

  return { categories: normalize<Category>(rawCategories), sources: normalize<string>(rawSources) };
}
