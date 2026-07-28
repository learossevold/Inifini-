import { SupabaseClient } from '@supabase/supabase-js';
import { Category, Comment, Profile, SharedStory, Story } from './types';

/**
 * Client-side data access for the social layer (friends, comments, shares,
 * saves/likes) against Supabase. None of these tables can be embedded via
 * PostgREST foreign-key joins to `profiles` (they reference auth.users, not
 * profiles), so related profiles/stories are fetched separately and stitched
 * in JS.
 */

const PROFILE_COLS = 'id, username, display_name, avatar_url, bio, created_at';

export async function fetchProfile(db: SupabaseClient, id: string): Promise<(Profile & { onboarded: boolean }) | null> {
  const { data } = await db.from('profiles').select(`${PROFILE_COLS}, onboarded`).eq('id', id).maybeSingle();
  return (data as any) ?? null;
}

export async function fetchProfilesByIds(db: SupabaseClient, ids: string[]): Promise<Record<string, Profile>> {
  if (ids.length === 0) return {};
  const { data } = await db.from('profiles').select(PROFILE_COLS).in('id', ids);
  const out: Record<string, Profile> = {};
  for (const p of (data as Profile[]) ?? []) out[p.id] = p;
  return out;
}

export async function searchProfiles(db: SupabaseClient, query: string, excludeId: string): Promise<Profile[]> {
  const q = query.trim().replace(/[%,]/g, '');
  if (!q) return [];
  const { data } = await db
    .from('profiles')
    .select(PROFILE_COLS)
    .neq('id', excludeId)
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(20);
  return (data as Profile[]) ?? [];
}

async function fetchStoriesByIds(db: SupabaseClient, ids: string[]): Promise<Record<string, Story>> {
  if (ids.length === 0) return {};
  const { data } = await db.from('stories').select('*').in('id', ids);
  const out: Record<string, Story> = {};
  for (const s of (data as any[]) ?? []) {
    out[s.id] = {
      like_count: 0, comment_count: 0, video_url: null, video_status: 'none', video_duration_seconds: null,
      ...s, ai_key_points: Array.isArray(s.ai_key_points) ? s.ai_key_points : [],
    } as Story;
  }
  return out;
}

// ---------- Interests ----------

export async function fetchInterests(db: SupabaseClient, userId: string): Promise<Category[]> {
  const { data } = await db.from('user_interests').select('category').eq('user_id', userId);
  return ((data as { category: Category }[]) ?? []).map((r) => r.category);
}

export async function saveInterests(db: SupabaseClient, userId: string, categories: Category[]): Promise<void> {
  await db.from('user_interests').delete().eq('user_id', userId);
  if (categories.length > 0) {
    await db.from('user_interests').insert(categories.map((category) => ({ user_id: userId, category })));
  }
}

export async function completeOnboardingRemote(
  db: SupabaseClient, userId: string, username: string, categories: Category[]
): Promise<{ error?: string }> {
  const { error } = await db.from('profiles').update({ username, display_name: username, onboarded: true }).eq('id', userId);
  if (error) return { error: error.message.includes('duplicate') ? 'That username is taken — try another.' : error.message };
  await saveInterests(db, userId, categories);
  return {};
}

// ---------- Friends ----------

export async function fetchFriendsAndRequests(db: SupabaseClient, myId: string): Promise<{ friends: Profile[]; requests: Profile[] }> {
  const { data } = await db.from('friendships').select('*').or(`user_id_1.eq.${myId},user_id_2.eq.${myId}`);
  const rows = (data as any[]) ?? [];
  const accepted = rows.filter((r) => r.status === 'accepted');
  const incoming = rows.filter((r) => r.status === 'pending' && r.user_id_2 === myId);
  const otherOf = (r: any) => (r.user_id_1 === myId ? r.user_id_2 : r.user_id_1);
  const otherIds = Array.from(new Set([...accepted.map(otherOf), ...incoming.map((r) => r.user_id_1)]));
  const profiles = await fetchProfilesByIds(db, otherIds);
  return {
    friends: accepted.map((r) => profiles[otherOf(r)]).filter(Boolean),
    requests: incoming.map((r) => profiles[r.user_id_1]).filter(Boolean),
  };
}

export async function sendFriendRequestRemote(db: SupabaseClient, myId: string, targetId: string): Promise<{ error?: string }> {
  const { data: existing } = await db.from('friendships').select('id')
    .or(`and(user_id_1.eq.${myId},user_id_2.eq.${targetId}),and(user_id_1.eq.${targetId},user_id_2.eq.${myId})`)
    .maybeSingle();
  if (existing) return { error: 'Already friends or a request is pending.' };
  const { error } = await db.from('friendships').insert({ user_id_1: myId, user_id_2: targetId, status: 'pending' });
  return error ? { error: error.message } : {};
}

export async function acceptFriendRemote(db: SupabaseClient, myId: string, otherId: string): Promise<void> {
  await db.from('friendships').update({ status: 'accepted' }).eq('user_id_1', otherId).eq('user_id_2', myId).eq('status', 'pending');
}

export async function declineFriendRemote(db: SupabaseClient, myId: string, otherId: string): Promise<void> {
  await db.from('friendships').delete().eq('user_id_1', otherId).eq('user_id_2', myId).eq('status', 'pending');
}

// ---------- Shares / inbox ----------

export async function fetchInbox(db: SupabaseClient, myId: string): Promise<SharedStory[]> {
  const { data } = await db.from('shared_stories').select('*').eq('to_user_id', myId).order('created_at', { ascending: false }).limit(50);
  const rows = (data as any[]) ?? [];
  const [stories, profiles] = await Promise.all([
    fetchStoriesByIds(db, Array.from(new Set(rows.map((r) => r.story_id)))),
    fetchProfilesByIds(db, Array.from(new Set(rows.map((r) => r.from_user_id)))),
  ]);
  return rows.map((r) => ({ ...r, story: stories[r.story_id], from: profiles[r.from_user_id] }));
}

export async function shareStoryRemote(db: SupabaseClient, myId: string, friendId: string, storyId: string): Promise<void> {
  await db.from('shared_stories').insert({ story_id: storyId, from_user_id: myId, to_user_id: friendId });
}

export async function markInboxReadRemote(db: SupabaseClient, myId: string, shareId: string): Promise<void> {
  await db.from('shared_stories').update({ read: true }).eq('id', shareId).eq('to_user_id', myId);
}

// ---------- Saves / likes ----------

export async function fetchSavesLikes(db: SupabaseClient, myId: string): Promise<{ saves: Set<string>; likes: Set<string> }> {
  const [{ data: saveRows }, { data: likeRows }] = await Promise.all([
    db.from('story_saves').select('story_id').eq('user_id', myId),
    db.from('story_likes').select('story_id').eq('user_id', myId),
  ]);
  return {
    saves: new Set(((saveRows as { story_id: string }[]) ?? []).map((r) => r.story_id)),
    likes: new Set(((likeRows as { story_id: string }[]) ?? []).map((r) => r.story_id)),
  };
}

export async function setSaveRemote(db: SupabaseClient, myId: string, storyId: string, saved: boolean): Promise<void> {
  if (saved) await db.from('story_saves').upsert({ story_id: storyId, user_id: myId });
  else await db.from('story_saves').delete().eq('story_id', storyId).eq('user_id', myId);
}

export async function setLikeRemote(db: SupabaseClient, myId: string, storyId: string, liked: boolean): Promise<void> {
  if (liked) await db.from('story_likes').upsert({ story_id: storyId, user_id: myId });
  else await db.from('story_likes').delete().eq('story_id', storyId).eq('user_id', myId);
}

// ---------- Comments ----------

export async function fetchComments(db: SupabaseClient, storyId: string, myId: string): Promise<Comment[]> {
  const { data } = await db.from('comments').select('*').eq('story_id', storyId).eq('hidden', false).order('created_at', { ascending: true });
  const list = (data as any[]) ?? [];
  const ids = list.map((c) => c.id);
  const [profiles, likeRows] = await Promise.all([
    fetchProfilesByIds(db, Array.from(new Set(list.map((c) => c.user_id)))),
    ids.length ? db.from('comment_likes').select('comment_id, user_id').in('comment_id', ids).then((r) => (r.data as any[]) ?? []) : Promise.resolve([] as any[]),
  ]);
  const likeCounts: Record<string, number> = {};
  const likedByMe = new Set<string>();
  for (const lr of likeRows) {
    likeCounts[lr.comment_id] = (likeCounts[lr.comment_id] ?? 0) + 1;
    if (lr.user_id === myId) likedByMe.add(lr.comment_id);
  }
  const byId: Record<string, Comment> = {};
  for (const c of list) {
    const p = profiles[c.user_id];
    byId[c.id] = {
      ...c,
      author: p ? { username: p.username, display_name: p.display_name, avatar_url: p.avatar_url } : undefined,
      like_count: likeCounts[c.id] ?? 0,
      liked_by_me: likedByMe.has(c.id),
      replies: [],
    };
  }
  const roots: Comment[] = [];
  for (const c of list) {
    const node = byId[c.id];
    if (c.parent_comment_id && byId[c.parent_comment_id]) byId[c.parent_comment_id].replies!.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function addCommentRemote(
  db: SupabaseClient, myId: string, storyId: string, content: string, parentId: string | null
): Promise<string | null> {
  const { data, error } = await db.from('comments').insert({ story_id: storyId, user_id: myId, parent_comment_id: parentId, content }).select('id').single();
  return error ? null : (data as any).id;
}

export async function setCommentLikeRemote(db: SupabaseClient, myId: string, commentId: string, liked: boolean): Promise<void> {
  if (liked) await db.from('comment_likes').upsert({ comment_id: commentId, user_id: myId });
  else await db.from('comment_likes').delete().eq('comment_id', commentId).eq('user_id', myId);
}
