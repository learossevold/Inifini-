'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Category, Comment, Profile, SharedStory } from '@/lib/types';
import {
  MOCK_ME, MOCK_FRIENDS, MOCK_FRIEND_REQUESTS, MOCK_COMMENTS, MOCK_INBOX, MOCK_USERS,
} from '@/lib/mock-data';

/**
 * Demo-mode session: a logged-in mock user with interests, saves, likes,
 * friends, comments and a shared-story inbox — all in memory.
 * Persists to memory only (no localStorage, per environment constraints);
 * resets on reload, which is fine for an MVP demo.
 *
 * When Supabase is wired up, these methods are the seam to swap for real calls.
 */

interface SessionState {
  me: Profile | null;
  onboarded: boolean;
  interests: Category[];
  saves: Set<string>;
  likes: Set<string>;
  friends: Profile[];
  friendRequests: Profile[];
  inbox: SharedStory[];
  commentsByStory: Record<string, Comment[]>;
}

interface SessionAPI extends SessionState {
  unreadCount: number;
  signIn: (username: string) => void;
  completeOnboarding: (username: string, interests: Category[]) => void;
  setInterests: (c: Category[]) => void;
  toggleSave: (storyId: string) => void;
  toggleLike: (storyId: string) => void;
  acceptFriend: (id: string) => void;
  declineFriend: (id: string) => void;
  markInboxRead: (id: string) => void;
  shareToFriend: (storyId: string, friendId: string) => void;
  addComment: (storyId: string, content: string, parentId?: string | null) => void;
  likeComment: (storyId: string, commentId: string) => void;
}

const Ctx = createContext<SessionAPI | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Profile | null>(MOCK_ME);
  const [onboarded, setOnboarded] = useState(false);
  const [interests, setInterestsState] = useState<Category[]>(['norway', 'world', 'ai', 'local']);
  const [saves, setSaves] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(new Set(['demo-2']));
  const [friends, setFriends] = useState<Profile[]>(MOCK_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<Profile[]>(MOCK_FRIEND_REQUESTS);
  const [inbox, setInbox] = useState<SharedStory[]>(MOCK_INBOX);
  const [commentsByStory, setCommentsByStory] = useState<Record<string, Comment[]>>(() =>
    JSON.parse(JSON.stringify(MOCK_COMMENTS))
  );

  // Mark onboarded after first mount if the mock user has a real-looking username already
  useEffect(() => { if (me && me.username && me.username !== '') setOnboarded(true); }, [me]);

  const signIn = useCallback((username: string) => {
    setMe({ ...MOCK_ME, username, display_name: username });
  }, []);

  const completeOnboarding = useCallback((username: string, chosen: Category[]) => {
    setMe((m) => (m ? { ...m, username, display_name: username } : m));
    setInterestsState(chosen.length ? chosen : ['norway', 'world']);
    setOnboarded(true);
  }, []);

  const setInterests = useCallback((c: Category[]) => setInterestsState(c), []);

  const toggleSave = useCallback((storyId: string) => {
    setSaves((prev) => { const n = new Set(prev); n.has(storyId) ? n.delete(storyId) : n.add(storyId); return n; });
  }, []);

  const toggleLike = useCallback((storyId: string) => {
    setLikes((prev) => { const n = new Set(prev); n.has(storyId) ? n.delete(storyId) : n.add(storyId); return n; });
  }, []);

  const acceptFriend = useCallback((id: string) => {
    setFriendRequests((reqs) => {
      const found = reqs.find((r) => r.id === id);
      if (found) setFriends((f) => [...f, found]);
      return reqs.filter((r) => r.id !== id);
    });
  }, []);

  const declineFriend = useCallback((id: string) => {
    setFriendRequests((reqs) => reqs.filter((r) => r.id !== id));
  }, []);

  const markInboxRead = useCallback((id: string) => {
    setInbox((prev) => prev.map((s) => (s.id === id ? { ...s, read: true } : s)));
  }, []);

  const shareToFriend = useCallback((storyId: string, friendId: string) => {
    // In demo mode we just acknowledge — a real impl writes to shared_stories.
    // No-op on local inbox (that's the recipient's), but we could log it.
    void storyId; void friendId;
  }, []);

  const addComment = useCallback((storyId: string, content: string, parentId: string | null = null) => {
    const author = me ? { username: me.username, display_name: me.display_name, avatar_url: me.avatar_url } : { username: 'you', display_name: 'You', avatar_url: null };
    const newC: Comment = {
      id: `local-${Date.now()}`, story_id: storyId, user_id: me?.id ?? 'me',
      parent_comment_id: parentId, content, created_at: new Date().toISOString(),
      hidden: false, author, like_count: 0, liked_by_me: false, replies: [],
    };
    setCommentsByStory((prev) => {
      const list = prev[storyId] ? [...prev[storyId]] : [];
      if (!parentId) return { ...prev, [storyId]: [newC, ...list] };
      const attach = (cs: Comment[]): Comment[] => cs.map((c) => c.id === parentId ? { ...c, replies: [...(c.replies ?? []), newC] } : { ...c, replies: c.replies ? attach(c.replies) : c.replies });
      return { ...prev, [storyId]: attach(list) };
    });
  }, [me]);

  const likeComment = useCallback((storyId: string, commentId: string) => {
    setCommentsByStory((prev) => {
      const toggle = (cs: Comment[]): Comment[] => cs.map((c) => {
        if (c.id === commentId) {
          const liked = !c.liked_by_me;
          return { ...c, liked_by_me: liked, like_count: (c.like_count ?? 0) + (liked ? 1 : -1) };
        }
        return { ...c, replies: c.replies ? toggle(c.replies) : c.replies };
      });
      return { ...prev, [storyId]: toggle(prev[storyId] ?? []) };
    });
  }, []);

  const unreadCount = inbox.filter((s) => !s.read).length + friendRequests.length;

  const value: SessionAPI = {
    me, onboarded, interests, saves, likes, friends, friendRequests, inbox, commentsByStory,
    unreadCount, signIn, completeOnboarding, setInterests, toggleSave, toggleLike,
    acceptFriend, declineFriend, markInboxRead, shareToFriend, addComment, likeComment,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionAPI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export { MOCK_USERS };
