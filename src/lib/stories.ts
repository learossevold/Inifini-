import { supabasePublic } from './supabase';
import { MOCK_STORIES, mockPage } from './mock-data';
import { rankStories, pickBreaking } from './ranking';
import { Category, FeedResponse, Story } from './types';

const PAGE_SIZE = 9;

export async function getFeed(page: number, interests: Category[], onlyInterests: boolean): Promise<FeedResponse> {
  const db = supabasePublic();
  let real: Story[] = [];
  if (db) {
    try {
      const { data } = await db.from('stories').select('*').eq('status', 'published').order('published_at', { ascending: false }).limit(400);
      real = ((data as any[]) ?? []).map((s) => ({
        like_count: 0,
        comment_count: 0,
        video_url: null,
        video_status: 'none',
        video_duration_seconds: null,
        ...s,
        ai_key_points: Array.isArray(s.ai_key_points) ? s.ai_key_points : [],
      })) as Story[];
    } catch { real = []; }
  }

  const mode: 'live' | 'mock' = real.length > 0 ? 'live' : 'mock';
  const pool = real.length > 0 ? real : MOCK_STORIES;
  const ranked = rankStories(pool, interests, onlyInterests);

  const start = page * PAGE_SIZE;
  const stories = ranked.slice(start, start + PAGE_SIZE);

  // Only pad with demo stories when there is no real data at all. In live mode
  // we never mix fake content into a real feed (see design rules).
  if (mode === 'mock' && stories.length < PAGE_SIZE) {
    const fillerPool = rankStories(MOCK_STORIES, interests, onlyInterests);
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
