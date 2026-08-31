'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FeedResponse, Story, FeedTab } from '@/lib/types';
import { EditorProfile, explainRecommendation } from '@/lib/affinity';
import { buildGreeting, Greeting } from '@/lib/greeting';
import { useSession } from '@/lib/session';
import { supabaseBrowser } from '@/lib/supabase';
import { setNativeStatusBarStyle } from '@/lib/nativeStatusBar';
import StoryCard from './StoryCard';
import ArticleView from './ArticleView';
import WatchFeed from './WatchFeed';
import ForYouFeed from './ForYouFeed';
import ShareSheet from './ShareSheet';
import CommentSheet from './CommentSheet';
import Logo from './Logo';
import { categoryLabel } from './ui';

export default function Feed() {
  const { me, interests, newsMode, followedSources, recordView, loadEditorProfile } = useSession();
  // Watch and News are the same stories in two registers, so only the one the
  // reader chose in Settings is ever on screen — leaving two tabs, not three.
  const TAB_ORDER: FeedTab[] = [newsMode, 'following'];
  const [tab, setTab] = useState<FeedTab>(newsMode);
  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareStory, setShareStory] = useState<Story | null>(null);
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<'live' | 'mock'>('mock');
  const [editorProfile, setEditorProfile] = useState<EditorProfile | null>(null);
  const [profileFetched, setProfileFetched] = useState(false);
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const isDev = process.env.NODE_ENV === 'development';

  // The stored preference is read on mount, after the first render — and the
  // reader can change it while the app is open. Either way, a tab that is no
  // longer one of the two on offer is swapped for the one that replaced it.
  useEffect(() => {
    setTab((t) => (t === 'following' ? t : newsMode));
  }, [newsMode]);

  const loadPage = useCallback(async (p: number, t: FeedTab, replace = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), tab: t });
      const headers: HeadersInit = {};
      if (t === 'following') {
        params.set('interests', interests.join(','));
        params.set('sources', Array.from(followedSources).join(','));
        // For You's ranking boost comes from the signed-in caller's own
        // reading history (see /api/stories), proven by their own session
        // token rather than a plain userId param anyone could pass in.
        // Demo mode and signed-out reading just skip this — For You still
        // works on the interest/source filter alone without it.
        const db = supabaseBrowser();
        const token = db ? (await db.auth.getSession()).data.session?.access_token : null;
        if (token) headers.authorization = `Bearer ${token}`;
      }
      const res = await fetch(`/api/stories?${params}`, { headers });
      if (!res.ok) throw new Error('Could not load stories');
      const data: FeedResponse = await res.json();
      setMode(data.mode);
      setStories((prev) => {
        const merged = replace ? data.stories : [...prev, ...data.stories];
        const seen = new Set<string>();
        return merged.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
      });
      setPage(p);
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong');
    } finally {
      setLoading(false); loadingRef.current = false;
    }
  }, [interests, followedSources]);

  const followingEmpty = tab === 'following' && interests.length === 0 && followedSources.size === 0;

  // Watch and For You are both full-screen swipe feeds; only News is an
  // ordinary scrolling page.
  const fullScreen = tab !== 'news';

  useEffect(() => {
    setStories([]); setExpandedId(null); setGreeting(null);
    window.scrollTo({ top: 0 });
    // For You with nothing chosen shows a prompt instead of any (mock) stories.
    if (followingEmpty) { setLoading(false); return; }
    loadPage(0, tab, true);
  }, [tab, loadPage, followingEmpty]);

  // The same signal that ranks For You, fetched once for display: the
  // "why this story" line on each card, the editor's pick, and the greeting
  // page all read from this, so what's said and what's shown can never drift
  // apart. profileFetched tracks whether the fetch has settled at all,
  // separately from the profile itself — a signed-out or brand-new reader
  // resolves to `null` too, and the greeting needs to tell "not personalised
  // yet" apart from "hasn't loaded yet" to avoid freezing on the generic line
  // before real personalisation had a chance to arrive.
  useEffect(() => {
    if (tab !== 'following') { setProfileFetched(false); return; }
    let cancelled = false;
    setProfileFetched(false);
    loadEditorProfile().then((p) => { if (!cancelled) { setEditorProfile(p); setProfileFetched(true); } });
    return () => { cancelled = true; };
  }, [tab, loadEditorProfile]);

  // The editor's opening line for this visit to the tab — built once
  // per open, from whichever profile/stories have finished loading by then,
  // and left alone after that. It's the feed's first page now, so it settling
  // late would shift every story's slot underneath it: For You waits for this
  // before mounting at all (see below), rather than growing a page in front
  // of the reader after they've started swiping.
  useEffect(() => {
    if (tab !== 'following') return;
    if (loading || stories.length === 0 || !profileFetched) return;
    setGreeting((g) => g ?? buildGreeting({ name: me?.display_name ?? null, profile: editorProfile, stories }));
  }, [tab, loading, stories, editorProfile, profileFetched, me]);

  // Watch and For You are full-screen feeds: switch the document scroller off
  // while one is open so a flick can only move the feed. Two scrollers is what
  // made a swipe land halfway — the page took part of it before the feed took
  // the rest.
  useEffect(() => {
    if (!fullScreen) return;
    document.documentElement.classList.add('fullscreen-lock');
    return () => document.documentElement.classList.remove('fullscreen-lock');
  }, [fullScreen]);

  // Inside the native iOS wrapper only (see lib/nativeStatusBar.ts) — Watch
  // is the one tab with a dark, full-screen background, so its status bar
  // icons need to switch to light along with it; everywhere else stays dark
  // icons over the paper background.
  useEffect(() => {
    setNativeStatusBarStyle(tab === 'watch' ? 'light' : 'dark');
  }, [tab]);

  // News snaps to the next story only while an article is open — see
  // .feed-snap in globals.css for why this is `proximity`, not the full-screen
  // feeds' `mandatory`. Cleared the moment the article closes, so ordinary
  // multi-card scrolling is completely free the rest of the time.
  useEffect(() => {
    if (fullScreen || !expandedId) return;
    document.documentElement.classList.add('feed-snap');
    return () => document.documentElement.classList.remove('feed-snap');
  }, [fullScreen, expandedId]);

  // Switches tabs and records which way, so the content area can play a
  // slide+fade that matches — right-to-left for moving forward into For You,
  // the reverse going back. Kept separate from the swipe gesture below so
  // tapping a tab button gets the same soft transition as swiping does.
  const goToTab = useCallback((next: FeedTab) => {
    setTransitionDirection(next === 'following' ? 'forward' : 'backward');
    setTab(next);
  }, []);

  // Swipe anywhere to switch tabs. Deliberately reads only where a touch
  // started and ended, never mid-gesture — nothing visually "drags" with the
  // finger, and staying passive throughout means it can never steal a touch
  // from a full-screen feed's own vertical gesture or from a normal page
  // scroll on News. A horizontal-dominant swipe past the threshold just steps
  // to the neighbouring tab once the finger lifts, with the same soft
  // transition a tab-button tap gets.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onStart = (e: TouchEvent) => {
      if (shareStory || commentStory || e.touches.length !== 1) { swipeStart.current = null; return; }
      swipeStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    const onEnd = (e: TouchEvent) => {
      const start = swipeStart.current;
      swipeStart.current = null;
      if (!start) return;
      const end = e.changedTouches[0];
      const dx = end.clientX - start.x;
      const dy = end.clientY - start.y;
      const MIN_DISTANCE = 60;
      if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const idx = TAB_ORDER.indexOf(tab);
      const next = dx < 0 ? idx + 1 : idx - 1;
      if (next >= 0 && next < TAB_ORDER.length) goToTab(TAB_ORDER[next]);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
    // TAB_ORDER is derived from newsMode and rebuilt each render; depending on
    // the array identity would reattach these listeners every time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, newsMode, shareStory, commentStory, goToTab]);

  // Infinite scroll for News (the full-screen feeds handle their own)
  useEffect(() => {
    if (fullScreen) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingRef.current && !error) loadPage(page + 1, tab);
    }, { rootMargin: '900px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, tab, error, loadPage, fullScreen]);

  // Used for two different taps that want two different scroll behaviours: a
  // Related link at the bottom of an article jumps to a story elsewhere in
  // the list, which genuinely needs finding and scrolling to; the next card
  // in the ordinary list, tapped right after finishing the one above it, is
  // already on screen and should just grow in place.
  //
  // The second case can't be handled by simply doing nothing and trusting
  // the browser to leave it alone. Collapsing whatever article was
  // previously open (which happens in this same state update, since only
  // one can be expanded at a time) reflows everything below it, and if that
  // article sat above the newly tapped card, the tapped card's on-screen
  // position shifts by however much the collapse freed up — with nothing
  // correcting for it, that shift can land the reader anywhere in the newly
  // expanded article, including its bottom, rather than at its top.
  //
  // So the position actually on screen at the moment of the tap is captured
  // first, and after the update settles, whatever moved is compensated for
  // with an explicit scroll — pinning the tapped card to the exact screen
  // position the reader already saw it at, rather than hoping the layout
  // change happens to leave it there on its own. The new article's heading
  // ends up exactly where the compact card's heading was, and everything
  // below is new: scrolling down keeps going, nothing has to be re-found.
  const openStory = useCallback((s: Story) => {
    const el = document.getElementById(`story-${s.id}`);
    const beforeTop = el?.getBoundingClientRect().top;
    // Deliberately generous — anything touching the viewport at all counts
    // as "already there", vs. a Related link that's supposed to jump you
    // to a story you can't currently see.
    const wasOnScreen = beforeTop !== undefined && beforeTop < window.innerHeight && beforeTop > -window.innerHeight;

    setExpandedId(s.id);
    recordView(s.id);

    requestAnimationFrame(() => {
      const el2 = document.getElementById(`story-${s.id}`);
      if (!el2) return;
      if (wasOnScreen && beforeTop !== undefined) {
        const afterTop = el2.getBoundingClientRect().top;
        const delta = afterTop - beforeTop;
        // 'instant', not 'auto' — html has scroll-behavior: smooth globally,
        // and per spec 'auto' means "defer to that CSS property," so it was
        // still animating this correction into place over several hundred ms
        // instead of landing it in the same frame. An animated correction is
        // exactly the visible "jump" this exists to prevent.
        if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: 'instant' });
      } else {
        el2.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }, [recordView]);

  const relatedFor = useCallback((s: Story) => stories.filter((x) => x.id !== s.id && (x.category === s.category || x.region === s.region)).slice(0, 3), [stories]);

  const reasonFor = useCallback((s: Story) => (editorProfile ? explainRecommendation(s, editorProfile) : null), [editorProfile]);

  // The two snap points for .feed-snap: the open article itself and the
  // story right after it, so the scroll that carries you past the article
  // settles at the top of the next one instead of somewhere mid-card.
  const expandedIdx = expandedId ? stories.findIndex((s) => s.id === expandedId) : -1;
  const nextSnapId = expandedIdx >= 0 && expandedIdx + 1 < stories.length ? stories[expandedIdx + 1].id : null;

  const followingLabels = [...interests.map(categoryLabel), ...Array.from(followedSources)];

  const TabBtn = ({ id, label }: { id: FeedTab; label: string }) => (
    <button
      onClick={() => goToTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`relative py-3.5 font-sans text-[16px] ${tab === id ? 'font-semibold text-ink' : 'text-muted'}`}
    >
      {label}
      {tab === id && <span className="absolute bottom-0 left-1/2 h-0.5 w-9 -translate-x-1/2 rounded-full bg-accent" />}
    </button>
  );

  const enterClass = transitionDirection === 'forward' ? 'tab-enter-forward' : 'tab-enter-backward';

  // Everything For You shows instead of the feed itself — no topics chosen,
  // the feed failed, or it came back empty. On a full-screen tab each of these
  // is a whole screen rather than a block at the top of a scrolling page.
  const forYouPlaceholder = followingEmpty ? (
    <div className="px-8 text-center">
      <p className="font-serif text-[26px] font-semibold leading-tight">Pick what you&rsquo;re into.</p>
      <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Choose the subjects and news outlets you care about. Everything they publish gathers here.</p>
      <Link href="/profile" className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Choose topics &amp; sources</Link>
    </div>
  ) : error && stories.length === 0 ? (
    <div className="px-8 text-center">
      <p className="font-serif text-[26px] font-semibold">The presses jammed.</p>
      <p className="mt-2 text-sm text-muted">{error}. Check your connection and try again.</p>
      <button onClick={() => loadPage(0, tab, true)} className="mt-5 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Reload</button>
    </div>
  ) : !loading && stories.length === 0 ? (
    <div className="px-8 text-center">
      <p className="font-serif text-[26px] font-semibold">Nothing here yet.</p>
      <p className="mt-2 text-sm text-muted">Pick more topics or sources to fill this feed.</p>
      <Link href="/profile" className="mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Edit topics &amp; sources</Link>
    </div>
  ) : // The greeting is page one, so nothing mounts until it's ready — see the
  // effect that builds it for why it can't be allowed to appear late.
  !greeting ? (
    <p className="text-muted">Loading…</p>
  ) : null;

  return (
    /* On Watch and For You the shell is a fixed-height flex column that clips
       its own overflow, so the feed inside it is the only thing on screen that
       scrolls. News scrolls the page as normal. */
    <div ref={rootRef} className={fullScreen ? 'fullscreen-shell flex flex-col overflow-hidden' : undefined}>
      {/* Brand mark left, the two feeds grouped in the middle. The spacer
          matches the mark's width so the group sits centred on screen rather
          than nudged right by it. */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-paper/95 backdrop-blur-sm">
        <div className="flex items-center px-4">
          <Link href="/" aria-label="Inifini home" className="shrink-0">
            <Logo size={30} />
          </Link>
          <nav className="flex flex-1 items-center justify-center gap-9">
            {/* Whichever of the two the reader chose in Settings — same
                stories either way, seen or read. */}
            <TabBtn id={newsMode} label={newsMode === 'watch' ? 'Watch' : 'News'} />
            {/* Internally still the "following" feed. Nobody follows *people*,
                so it reads as For You: your interests plus the outlets you picked. */}
            <TabBtn id="following" label="For You" />
          </nav>
          <span className="w-[30px] shrink-0" aria-hidden />
        </div>
      </header>

      {shareStory && <ShareSheet story={shareStory} onClose={() => setShareStory(null)} />}
      {commentStory && <CommentSheet story={commentStory} onClose={() => setCommentStory(null)} />}

      {/* WATCH TAB */}
      {tab === 'watch' ? (
        /* min-h-0 lets this shrink to the space the header leaves, instead of
           being floored at its content height and pushing the feed off-screen.
           key={tab} plus the direction class replays a short slide+fade on
           every switch — see the two tab-enter-* rules in globals.css — so a
           swipe or a tab tap settles in gently instead of hard-cutting. */
        <div key={tab} className={`min-h-0 flex-1 ${enterClass}`}>
          {loading && stories.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">Loading…</div>
          ) : (
            <WatchFeed stories={stories} onShare={(s) => setShareStory(s)} onNeedMore={() => loadPage(page + 1, 'watch')} />
          )}
        </div>
      ) : tab === 'following' ? (
        /* FOR YOU TAB — the same full-screen swipe as Watch, in daylight. */
        <div key={tab} className={`min-h-0 flex-1 ${enterClass}`}>
          {forYouPlaceholder ? (
            <div className="flex h-full items-center justify-center">{forYouPlaceholder}</div>
          ) : (
            <ForYouFeed
              stories={stories}
              greeting={greeting}
              following={followingLabels}
              reasonFor={reasonFor}
              relatedFor={relatedFor}
              showDemoTag={isDev}
              onShare={(s) => setShareStory(s)}
              onNeedMore={() => loadPage(page + 1, 'following')}
            />
          )}
        </div>
      ) : (
        /* NEWS TAB */
        <main key={tab} className={`px-4 ${enterClass}`}>
          {error && stories.length === 0 && (
            <div className="mt-16 text-center">
              <p className="font-serif text-xl font-semibold">The presses jammed.</p>
              <p className="mt-2 text-sm text-muted">{error}. Check your connection and try again.</p>
              <button onClick={() => loadPage(0, tab, true)} className="mt-5 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Reload</button>
            </div>
          )}

          {!loading && !error && stories.length === 0 && (
            <div className="mt-16 text-center">
              <p className="font-serif text-xl font-semibold">Nothing here yet.</p>
              <p className="mt-2 text-sm text-muted">No stories right now.</p>
            </div>
          )}

          <div className="space-y-9 pt-6">
            {stories.map((s, i) => {
              const isSnapPoint = s.id === expandedId || s.id === nextSnapId;
              return (
              <div key={s.id} id={`story-${s.id}`} className={`scroll-mt-28${isSnapPoint ? ' feed-snap-point' : ''}`}>
                {expandedId === s.id ? (
                  <ArticleView story={s} related={relatedFor(s)} onClose={() => setExpandedId(null)} onOpen={openStory} onShare={(st) => setShareStory(st)} onComment={(st) => setCommentStory(st)} />
                ) : (
                  <StoryCard story={s} lead={i === 0} showDemoTag={isDev} onOpen={openStory} onComment={() => setCommentStory(s)} onShare={(st) => setShareStory(st)} />
                )}
              </div>
              );
            })}
          </div>

          {loading && (
            <div className="space-y-9 pt-8" role="status" aria-label="Loading">
              {Array.from({ length: stories.length === 0 ? 3 : 1 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[16/10] rounded-lg bg-rule/70" />
                  <div className="mt-4 h-3 w-24 rounded bg-rule/70" /><div className="mt-3 h-6 w-5/6 rounded bg-rule/70" /><div className="mt-2 h-6 w-2/3 rounded bg-rule/70" />
                </div>
              ))}
            </div>
          )}

          <div ref={sentinelRef} className="h-px" />
          {mode === 'mock' && isDev && <p className="mt-10 pb-4 text-center text-[11px] text-muted">Development mode · demo content (no database/API connected)</p>}
        </main>
      )}
    </div>
  );
}
