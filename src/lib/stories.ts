import { supabasePublic } from './supabase';
import { MOCK_STORIES, mockPage } from './mock-data';
import { rankStories, pickBreaking } from './ranking';
import { upgradeImageUrl } from './images';
import { stripEmDashes } from './text';
import { Affinity } from './affinity';
import { Category, FeedResponse, Story } from './types';

const PAGE_SIZE = 9;

const HYDRATE_DEFAULTS = {
  like_count: 0,
  comment_count: 0,
  video_url: null,
  video_status: 'none',
  video_duration_seconds: null,
  audio_url: null,
  audio_status: 'none',
  audio_duration_seconds: null,
};

/**
 * Shape a raw row into a Story: ask the publisher's CDN for a large image, and
 * clean em dashes out of text written before the house style ruled them out.
 */
function hydrate(row: any): Story {
  return {
    ...HYDRATE_DEFAULTS,
    ...row,
    image_url: row.image_url ? upgradeImageUrl(row.image_url) : row.image_url,
    title: stripEmDashes(row.title ?? ''),
    ai_short_summary: stripEmDashes(row.ai_short_summary ?? ''),
    ai_medium_summary: stripEmDashes(row.ai_medium_summary ?? ''),
    ai_why_it_matters: stripEmDashes(row.ai_why_it_matters ?? ''),
    ai_background: stripEmDashes(row.ai_background ?? ''),
    ai_what_next: stripEmDashes(row.ai_what_next ?? ''),
    ai_key_points: Array.isArray(row.ai_key_points) ? row.ai_key_points.map((p: unknown) => stripEmDashes(String(p))) : [],
  } as Story;
}

/** One published story by slug — powers the public, shareable story page. */
export async function getStoryBySlug(slug: string): Promise<Story | null> {
  const db = supabasePublic();
  if (db) {
    try {
      const { data } = await db.from('stories').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
      if (data) return hydrate(data);
    } catch (e: any) {
      // Silently returning demo content here used to also silently hide *why*
      // — a paused Supabase project and a genuine bug both looked identical
      // from the outside. This is exactly what to grep Vercel's function logs
      // for when the app unexpectedly falls back to demo content.
      console.error('[stories] getStoryBySlug fell back to demo content:', e?.message ?? e, e?.code ? `(code: ${e.code})` : '');
    }
  }
  return MOCK_STORIES.find((s) => s.slug === slug) ?? null;
}

export async function getFeed(page: number, interests: Category[], onlyInterests: boolean, followedSources: string[] = [], affinity?: Affinity): Promise<FeedResponse> {
  const db = supabasePublic();
  let real: Story[] = [];
  if (db) {
    try {
      const { data, error } = await db.from('stories').select('*').eq('status', 'published').not('source_domain', 'in', '("nrk.no","e24.no")').order('published_at', { ascending: false }).limit(400);
      if (error) throw error;
      real = ((data as any[]) ?? []).map(hydrate);
      // The query can succeed with zero rows just as easily as it can throw —
      // an empty published-stories table falls back to demo content exactly
      // the same way a broken connection does, but it means something
      // different (ingestion never ran / nothing passed moderation, not
      // "database unreachable"). Worth its own log line to tell them apart.
      if (real.length === 0) console.error('[stories] getFeed: query succeeded but found 0 published stories — falling back to demo content.');
    } catch (e: any) {
      console.error('[stories] getFeed fell back to demo content:', e?.message ?? e, e?.code ? `(code: ${e.code})` : '');
      real = [];
    }
  } else {
    console.error('[stories] getFeed: Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing) — running on demo content.');
  }

  const mode: 'live' | 'mock' = real.length > 0 ? 'live' : 'mock';
  const pool = real.length > 0 ? real : MOCK_STORIES;
  const ranked = rankStories(pool, interests, onlyInterests, followedSources, affinity);

  const start = page * PAGE_SIZE;
  const stories = ranked.slice(start, start + PAGE_SIZE);

  // Only pad with demo stories when there is no real data at all. In live mode
  // we never mix fake content into a real feed (see design rules).
  if (mode === 'mock' && stories.length < PAGE_SIZE) {
    const fillerPool = rankStories(MOCK_STORIES, interests, onlyInterests, followedSources, affinity);
    const filler = mockPage(page, fillerPool.length ? fillerPool : MOCK_STORIES);
    const seen = new Set(stories.map((s) => s.id));
    for (const f of filler) {
      if (stories.length >= PAGE_SIZE) break;
      if (!seen.has(f.id)) { stories.push(f); seen.add(f.id); }
    }
  }

  // In live mode the feed ends when real stories run out; mock mode cycles forever.
  const hasMore = mode === 'mock' ? true : start + PAGE_SIZE < ranked.length;
  return { stories, breaking: page === 0 ? pickBreaking(pool) : [], page, hasMore, mode };
}
