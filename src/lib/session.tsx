'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { Category, Comment, Conversation, Message, Profile } from '@/lib/types';
import {
  MOCK_ME, MOCK_FRIENDS, MOCK_FRIEND_REQUESTS, MOCK_COMMENTS, MOCK_USERS,
  MOCK_CONVERSATIONS, MOCK_THREADS, MOCK_STORIES,
} from '@/lib/mock-data';
import { supabaseBrowser, supabaseConfigured } from '@/lib/supabase';
import * as social from '@/lib/social';

/**
 * Session: signed-in user + the social layer (friends, comments, shares,
 * saves/likes).
 *
 * Without Supabase configured, this runs as an in-memory demo (mock user,
 * mock friends/comments, resets on reload) — the zero-key experience.
 *
 * With Supabase configured, it drives real magic-link auth and every action
 * writes through to the database (see src/lib/social.ts for the queries).
 */

export type AuthStatus = 'loading' | 'signed-out' | 'needs-onboarding' | 'ready';

interface SessionState {
  me: Profile | null;
  onboarded: boolean;
  interests: Category[];
  followedSources: Set<string>;
  saves: Set<string>;
  likes: Set<string>;
  friends: Profile[];
  friendRequests: Profile[];
  conversations: Conversation[];
  commentsByStory: Record<string, Comment[]>;
}

interface SessionAPI extends SessionState {
  configured: boolean;
  status: AuthStatus;
  /** True when actions that need an identity (comment, like, message) are allowed. */
  canAct: boolean;
  /** Set when a signed-out reader tried a gated action — show the sign-in prompt. */
  signInPrompt: string | null;
  promptSignIn: (reason?: string) => void;
  dismissSignInPrompt: () => void;
  unreadCount: number;
  signInWithEmail: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  completeOnboarding: (username: string, interests: Category[]) => Promise<{ error?: string }>;
  setInterests: (c: Category[]) => void;
  toggleSource: (domain: string) => void;
  toggleSave: (storyId: string) => void;
  toggleLike: (storyId: string) => void;
  sendFriendRequest: (targetId: string) => Promise<{ error?: string }>;
  acceptFriend: (id: string) => void;
  declineFriend: (id: string) => void;
  shareToFriend: (storyId: string, friendId: string) => void;
  loadThread: (otherId: string) => Promise<Message[]>;
  sendMessage: (otherId: string, content: string) => Promise<void>;
  markConversationRead: (otherId: string) => void;
  addComment: (storyId: string, content: string, parentId?: string | null) => void;
  likeComment: (storyId: string, commentId: string) => void;
  ensureComments: (storyId: string) => void;
}

const Ctx = createContext<SessionAPI | null>(null);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = supabaseConfigured();

  const [me, setMe] = useState<Profile | null>(configured ? null : MOCK_ME);
  const [status, setStatus] = useState<AuthStatus>(configured ? 'loading' : 'ready');
  const [onboarded, setOnboarded] = useState(!configured);
  const [interests, setInterestsState] = useState<Category[]>(['norway', 'world', 'ai', 'local']);
  const [followedSources, setFollowedSources] = useState<Set<string>>(new Set());
  const [saves, setSaves] = useState<Set<string>>(new Set());
  const [likes, setLikes] = useState<Set<string>>(configured ? new Set() : new Set(['demo-2']));
  const [friends, setFriends] = useState<Profile[]>(configured ? [] : MOCK_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<Profile[]>(configured ? [] : MOCK_FRIEND_REQUESTS);
  const [conversations, setConversations] = useState<Conversation[]>(configured ? [] : MOCK_CONVERSATIONS);
  const [commentsByStory, setCommentsByStory] = useState<Record<string, Comment[]>>(() =>
    configured ? {} : JSON.parse(JSON.stringify(MOCK_COMMENTS))
  );
  const loadedCommentsRef = useRef<Set<string>>(new Set());
  const [signInPrompt, setSignInPrompt] = useState<string | null>(null);
  // Demo mode keeps threads in memory so a sent message shows up in the chat.
  const mockThreadsRef = useRef<Record<string, Message[]>>(
    configured ? {} : JSON.parse(JSON.stringify(MOCK_THREADS))
  );

  // ---- Real auth: track the Supabase session and load user data on sign-in ----
  useEffect(() => {
    if (!configured) return;
    const db = supabaseBrowser();
    if (!db) return;
    let cancelled = false;

    const loadForUser = async (uid: string) => {
      let profile = await social.fetchProfile(db, uid);
      for (let i = 0; i < 6 && !profile; i++) { await sleep(400); profile = await social.fetchProfile(db, uid); }
      if (cancelled || !profile) return;

      setMe({ id: profile.id, username: profile.username, display_name: profile.display_name, avatar_url: profile.avatar_url, bio: profile.bio, created_at: profile.created_at });

      if (!profile.onboarded) {
        setOnboarded(false);
        setStatus('needs-onboarding');
        return;
      }

      const [ints, srcs, fr, convos, sl] = await Promise.all([
        social.fetchInterests(db, uid),
        social.fetchFollowedSources(db, uid),
        social.fetchFriendsAndRequests(db, uid),
        social.fetchConversations(db, uid),
        social.fetchSavesLikes(db, uid),
      ]);
      if (cancelled) return;
      setInterestsState(ints);
      setFollowedSources(new Set(srcs));
      setFriends(fr.friends);
      setFriendRequests(fr.requests);
      setConversations(convos);
      setSaves(sl.saves);
      setLikes(sl.likes);
      setOnboarded(true);
      setStatus('ready');
    };

    db.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) loadForUser(data.session.user.id);
      else setStatus('signed-out');
    });

    const { data: sub } = db.auth.onAuthStateChange((_event, session) => {
      if (session) loadForUser(session.user.id);
      else { setMe(null); setOnboarded(false); setStatus('signed-out'); }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
  }, [configured]);

  // Reading is always open. Anything that needs an identity — commenting,
  // liking, saving, friends, messages — asks for sign-in at the moment it's
  // used, rather than gating the whole app up front.
  const canAct = !configured || Boolean(me);

  const promptSignIn = useCallback((reason?: string) => {
    setSignInPrompt(reason ?? 'Sign in to do that.');
  }, []);

  const dismissSignInPrompt = useCallback(() => setSignInPrompt(null), []);

  /** Returns true (and shows the prompt) when the action should be blocked. */
  const blocked = useCallback((reason: string): boolean => {
    if (canAct) return false;
    setSignInPrompt(reason);
    return true;
  }, [canAct]);

  const signInWithEmail = useCallback(async (email: string): Promise<{ error?: string }> => {
    const db = supabaseBrowser();
    if (!db) return { error: 'Not configured' };
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined },
    });
    return error ? { error: error.message } : {};
  }, []);

  const signOut = useCallback(async () => {
    const db = supabaseBrowser();
    if (db) await db.auth.signOut();
  }, []);

  const completeOnboarding = useCallback(async (username: string, chosen: Category[]): Promise<{ error?: string }> => {
    const db = supabaseBrowser();
    if (db && me) {
      const { error } = await social.completeOnboardingRemote(db, me.id, username, chosen);
      if (error) return { error };
      setMe((m) => (m ? { ...m, username, display_name: username } : m));
      setInterestsState(chosen);
      setOnboarded(true);
      setStatus('ready');
      return {};
    }
    // Mock mode
    setMe((m) => (m ? { ...m, username, display_name: username } : m));
    setInterestsState(chosen.length ? chosen : ['norway', 'world']);
    setOnboarded(true);
    return {};
  }, [me]);

  const setInterests = useCallback((c: Category[]) => {
    setInterestsState(c);
    const db = supabaseBrowser();
    if (db && me) social.saveInterests(db, me.id, c);
  }, [me]);

  const toggleSource = useCallback((domain: string) => {
    const next = new Set(followedSources);
    next.has(domain) ? next.delete(domain) : next.add(domain);
    setFollowedSources(next);
    const db = supabaseBrowser();
    if (db && me) social.saveFollowedSources(db, me.id, Array.from(next));
  }, [followedSources, me]);

  const toggleSave = useCallback((storyId: string) => {
    if (blocked('Sign in to save stories and keep them across devices.')) return;
    const wasSaved = saves.has(storyId);
    const next = new Set(saves);
    wasSaved ? next.delete(storyId) : next.add(storyId);
    setSaves(next);
    const db = supabaseBrowser();
    if (db && me) social.setSaveRemote(db, me.id, storyId, !wasSaved);
  }, [saves, me, blocked]);

  const toggleLike = useCallback((storyId: string) => {
    if (blocked('Sign in to like stories.')) return;
    const wasLiked = likes.has(storyId);
    const next = new Set(likes);
    wasLiked ? next.delete(storyId) : next.add(storyId);
    setLikes(next);
    const db = supabaseBrowser();
    if (db && me) social.setLikeRemote(db, me.id, storyId, !wasLiked);
  }, [likes, me, blocked]);

  const sendFriendRequest = useCallback(async (targetId: string): Promise<{ error?: string }> => {
    if (blocked('Sign in to add friends.')) return {};
    const db = supabaseBrowser();
    if (!db || !me) return { error: 'Sign in required.' };
    return social.sendFriendRequestRemote(db, me.id, targetId);
  }, [me, blocked]);

  const acceptFriend = useCallback((id: string) => {
    setFriendRequests((reqs) => {
      const found = reqs.find((r) => r.id === id);
      if (found) setFriends((f) => [...f, found]);
      return reqs.filter((r) => r.id !== id);
    });
    const db = supabaseBrowser();
    if (db && me) social.acceptFriendRemote(db, me.id, id);
  }, [me]);

  const declineFriend = useCallback((id: string) => {
    setFriendRequests((reqs) => reqs.filter((r) => r.id !== id));
    const db = supabaseBrowser();
    if (db && me) social.declineFriendRemote(db, me.id, id);
  }, [me]);

  /** Move a conversation to the top of the inbox with its newest message. */
  const bumpConversation = useCallback((partnerId: string, message: Message) => {
    setConversations((prev) => {
      const existing = prev.find((c) => c.user.id === partnerId);
      const user = existing?.user ?? friends.find((f) => f.id === partnerId) ?? MOCK_USERS.find((u) => u.id === partnerId);
      if (!user) return prev;
      const rest = prev.filter((c) => c.user.id !== partnerId);
      const unread = message.recipient_id === (me?.id ?? 'me') && !message.read ? (existing?.unread ?? 0) + 1 : (existing?.unread ?? 0);
      return [{ user, lastMessage: message, unread }, ...rest];
    });
  }, [friends, me]);

  const shareToFriend = useCallback((storyId: string, friendId: string) => {
    if (blocked('Sign in to send stories to friends.')) return;
    const myId = me?.id ?? 'me';
    const local: Message = {
      id: `local-${Date.now()}`, sender_id: myId, recipient_id: friendId,
      content: null, story_id: storyId, created_at: new Date().toISOString(), read: true,
      story: MOCK_STORIES.find((s) => s.id === storyId),
    };
    const db = supabaseBrowser();
    if (db && me) {
      social.sendMessageRemote(db, me.id, friendId, null, storyId);
    } else {
      const thread = mockThreadsRef.current[friendId] ?? [];
      mockThreadsRef.current[friendId] = [...thread, local];
    }
    bumpConversation(friendId, local);
  }, [me, bumpConversation, blocked]);

  const loadThread = useCallback(async (otherId: string): Promise<Message[]> => {
    const db = supabaseBrowser();
    if (db && me) return social.fetchThread(db, me.id, otherId);
    // Demo mode: attach the story each shared message points at.
    return (mockThreadsRef.current[otherId] ?? []).map((m) =>
      m.story_id ? { ...m, story: m.story ?? MOCK_STORIES.find((s) => s.id === m.story_id) } : m
    );
  }, [me]);

  const sendMessage = useCallback(async (otherId: string, content: string): Promise<void> => {
    if (blocked('Sign in to send messages.')) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    const myId = me?.id ?? 'me';
    const local: Message = {
      id: `local-${Date.now()}`, sender_id: myId, recipient_id: otherId,
      content: trimmed, story_id: null, created_at: new Date().toISOString(), read: true,
    };
    const db = supabaseBrowser();
    if (db && me) {
      await social.sendMessageRemote(db, me.id, otherId, trimmed, null);
    } else {
      const thread = mockThreadsRef.current[otherId] ?? [];
      mockThreadsRef.current[otherId] = [...thread, local];
    }
    bumpConversation(otherId, local);
  }, [me, bumpConversation, blocked]);

  const markConversationRead = useCallback((otherId: string) => {
    setConversations((prev) => prev.map((c) => (c.user.id === otherId ? { ...c, unread: 0 } : c)));
    const db = supabaseBrowser();
    if (db && me) { social.markThreadReadRemote(db, me.id, otherId); return; }
    const thread = mockThreadsRef.current[otherId];
    if (thread) mockThreadsRef.current[otherId] = thread.map((m) => ({ ...m, read: true }));
  }, [me]);

  const addComment = useCallback((storyId: string, content: string, parentId: string | null = null) => {
    if (blocked('Sign in to join the conversation.')) return;
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
    const db = supabaseBrowser();
    if (db && me) social.addCommentRemote(db, me.id, storyId, content, parentId);
  }, [me, blocked]);

  const likeComment = useCallback((storyId: string, commentId: string) => {
    if (blocked('Sign in to like comments.')) return;
    const list = commentsByStory[storyId] ?? [];
    let nextLiked = false;
    const toggle = (cs: Comment[]): Comment[] => cs.map((c) => {
      if (c.id === commentId) {
        nextLiked = !c.liked_by_me;
        return { ...c, liked_by_me: nextLiked, like_count: (c.like_count ?? 0) + (nextLiked ? 1 : -1) };
      }
      return { ...c, replies: c.replies ? toggle(c.replies) : c.replies };
    });
    setCommentsByStory((prev) => ({ ...prev, [storyId]: toggle(list) }));
    const db = supabaseBrowser();
    if (db && me) social.setCommentLikeRemote(db, me.id, commentId, nextLiked);
  }, [commentsByStory, me, blocked]);

  const ensureComments = useCallback((storyId: string) => {
    const db = supabaseBrowser();
    if (!db || !me || loadedCommentsRef.current.has(storyId)) return;
    loadedCommentsRef.current.add(storyId);
    social.fetchComments(db, storyId, me.id).then((comments) => {
      setCommentsByStory((prev) => ({ ...prev, [storyId]: comments }));
    });
  }, [me]);

  const unreadCount = conversations.reduce((n, c) => n + c.unread, 0) + friendRequests.length;

  const value: SessionAPI = {
    me, onboarded, interests, followedSources, saves, likes, friends, friendRequests, conversations, commentsByStory,
    configured, status, canAct, signInPrompt, promptSignIn, dismissSignInPrompt, unreadCount,
    signInWithEmail, signOut, completeOnboarding, setInterests, toggleSource, toggleSave, toggleLike,
    sendFriendRequest, acceptFriend, declineFriend, shareToFriend,
    loadThread, sendMessage, markConversationRead,
    addComment, likeComment, ensureComments,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionAPI {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

export { MOCK_USERS };
