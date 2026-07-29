import { SupabaseClient } from '@supabase/supabase-js';
import { Category, Comment, Conversation, Message, Profile, Story } from './types';

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
  const [{ data }, blocked] = await Promise.all([
    db.from('profiles')
      .select(PROFILE_COLS)
      .neq('id', excludeId)
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(20),
    fetchBlockedIds(db, excludeId),
  ]);
  return ((data as Profile[]) ?? []).filter((p) => !blocked.has(p.id));
}

export async function fetchStoriesByIds(db: SupabaseClient, ids: string[]): Promise<Record<string, Story>> {
  if (ids.length === 0) return {};
  const { data } = await db.from('stories').select('*').in('id', ids);
  const out: Record<string, Story> = {};
  for (const s of (data as any[]) ?? []) {
    out[s.id] = {
      like_count: 0, comment_count: 0, video_url: null, video_status: 'none', video_duration_seconds: null,
      audio_url: null, audio_status: 'none', audio_duration_seconds: null,
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

export async function fetchFollowedSources(db: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await db.from('user_sources').select('source_domain').eq('user_id', userId);
  return ((data as { source_domain: string }[]) ?? []).map((r) => r.source_domain);
}

export async function saveFollowedSources(db: SupabaseClient, userId: string, domains: string[]): Promise<void> {
  await db.from('user_sources').delete().eq('user_id', userId);
  if (domains.length > 0) {
    await db.from('user_sources').insert(domains.map((source_domain) => ({ user_id: userId, source_domain })));
  }
}

export async function updateProfileRemote(
  db: SupabaseClient, userId: string, patch: { display_name?: string; avatar_url?: string | null }
): Promise<{ error?: string }> {
  const { error } = await db.from('profiles').update(patch).eq('id', userId);
  return error ? { error: error.message } : {};
}

export async function completeOnboardingRemote(
  db: SupabaseClient, userId: string, username: string, categories: Category[]
): Promise<{ error?: string }> {
  const { error } = await db.from('profiles').update({ username, display_name: username, onboarded: true }).eq('id', userId);
  if (error) return { error: error.message.includes('duplicate') ? 'That username is taken. Try another one.' : error.message };
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

// ---------- Blocks ----------

/** Everyone I've blocked, plus everyone who has blocked me — both are hidden from me. */
export async function fetchBlockedIds(db: SupabaseClient, myId: string): Promise<Set<string>> {
  const [mine, theirs] = await Promise.all([
    db.from('blocks').select('blocked_id').eq('blocker_id', myId),
    db.from('blocks').select('blocker_id').eq('blocked_id', myId),
  ]);
  const ids = new Set<string>();
  for (const r of ((mine.data as { blocked_id: string }[]) ?? [])) ids.add(r.blocked_id);
  for (const r of ((theirs.data as { blocker_id: string }[]) ?? [])) ids.add(r.blocker_id);
  return ids;
}

export async function blockUserRemote(db: SupabaseClient, myId: string, targetId: string): Promise<{ error?: string }> {
  const { error } = await db.from('blocks').upsert({ blocker_id: myId, blocked_id: targetId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) return { error: error.message };
  // A block ends the friendship too — otherwise they'd still appear in your list.
  await db.from('friendships').delete()
    .or(`and(user_id_1.eq.${myId},user_id_2.eq.${targetId}),and(user_id_1.eq.${targetId},user_id_2.eq.${myId})`);
  return {};
}

export async function unblockUserRemote(db: SupabaseClient, myId: string, targetId: string): Promise<void> {
  await db.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', targetId);
}

/** Only the people I blocked myself — the list I can undo. */
export async function fetchMyBlocks(db: SupabaseClient, myId: string): Promise<Profile[]> {
  const { data } = await db.from('blocks').select('blocked_id').eq('blocker_id', myId);
  const ids = ((data as { blocked_id: string }[]) ?? []).map((r) => r.blocked_id);
  const profiles = await fetchProfilesByIds(db, ids);
  return ids.map((id) => profiles[id]).filter(Boolean);
}

// ---------- Direct messages ----------
// Sharing a story to a friend is a message with `story_id` set, so shares and
// chat live in the same conversation (superseding the old shared_stories table).

/**
 * Every message I'm part of, collapsed into one row per conversation partner.
 * Fetched in a single query and grouped in JS — the volume per user is small,
 * and it avoids a round trip per conversation.
 */
export async function fetchConversations(db: SupabaseClient, myId: string): Promise<Conversation[]> {
  const [{ data }, blocked] = await Promise.all([
    db.from('messages')
      .select('*')
      .or(`sender_id.eq.${myId},recipient_id.eq.${myId}`)
      .order('created_at', { ascending: false })
      .limit(400),
    fetchBlockedIds(db, myId),
  ]);
  const rows = (data as Message[]) ?? [];
  if (rows.length === 0) return [];

  const latestByPartner = new Map<string, Message>();
  const unreadByPartner = new Map<string, number>();
  for (const m of rows) {
    const partner = m.sender_id === myId ? m.recipient_id : m.sender_id;
    if (blocked.has(partner)) continue;
    if (!latestByPartner.has(partner)) latestByPartner.set(partner, m); // rows are newest-first
    if (m.recipient_id === myId && !m.read) unreadByPartner.set(partner, (unreadByPartner.get(partner) ?? 0) + 1);
  }

  const partnerIds = Array.from(latestByPartner.keys());
  const storyIds = Array.from(new Set(Array.from(latestByPartner.values()).map((m) => m.story_id).filter(Boolean) as string[]));
  const [profiles, stories] = await Promise.all([
    fetchProfilesByIds(db, partnerIds),
    fetchStoriesByIds(db, storyIds),
  ]);

  return partnerIds
    .filter((id) => profiles[id])
    .map((id) => {
      const lastMessage = latestByPartner.get(id)!;
      return {
        user: profiles[id],
        lastMessage: lastMessage.story_id ? { ...lastMessage, story: stories[lastMessage.story_id] } : lastMessage,
        unread: unreadByPartner.get(id) ?? 0,
      };
    });
}

/** The full back-and-forth with one person, oldest first. */
export async function fetchThread(db: SupabaseClient, myId: string, otherId: string): Promise<Message[]> {
  const { data } = await db
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`)
    .order('created_at', { ascending: true })
    .limit(300);
  const rows = (data as Message[]) ?? [];
  const storyIds = Array.from(new Set(rows.map((m) => m.story_id).filter(Boolean) as string[]));
  const stories = await fetchStoriesByIds(db, storyIds);
  return rows.map((m) => (m.story_id ? { ...m, story: stories[m.story_id] } : m));
}

export async function sendMessageRemote(
  db: SupabaseClient, myId: string, otherId: string, content: string | null, storyId: string | null
): Promise<Message | null> {
  const { data, error } = await db
    .from('messages')
    .insert({ sender_id: myId, recipient_id: otherId, content, story_id: storyId })
    .select('*')
    .single();
  return error ? null : (data as Message);
}

export async function markThreadReadRemote(db: SupabaseClient, myId: string, otherId: string): Promise<void> {
  await db.from('messages').update({ read: true }).eq('recipient_id', myId).eq('sender_id', otherId).eq('read', false);
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
  const [{ data }, blocked] = await Promise.all([
    db.from('comments').select('*').eq('story_id', storyId).eq('hidden', false).order('created_at', { ascending: true }),
    fetchBlockedIds(db, myId),
  ]);
  // Comments from (or to) someone either side has blocked never render.
  const list = ((data as any[]) ?? []).filter((c) => !blocked.has(c.user_id));
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
