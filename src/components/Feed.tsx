'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FeedResponse, Story, FeedTab } from '@/lib/types';
import { EditorProfile, explainRecommendation } from '@/lib/affinity';
import { useSession } from '@/lib/session';
import { supabaseBrowser } from '@/lib/supabase';
import StoryCard from './StoryCard';
import ArticleView from './ArticleView';
import WatchFeed from './WatchFeed';
import ShareSheet from './ShareSheet';
import CommentSheet from './CommentSheet';
import TodaysRecommendation from './TodaysRecommendation';
import Logo from './Logo';
import { categoryLabel } from './ui';

export default function Feed() {
  const { interests, followedSources, recordView, loadEditorProfile } = useSession();
  const [tab, setTab] = useState<FeedTab>('watch');
  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareStory, setShareStory] = useState<Story | null>(null);
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<'live' | 'mock'>('mock');
  const [editorProfile, setEditorProfile] = useState<EditorProfile | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const isDev = process.env.NODE_ENV === 'development';

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
        // Explore's ranking boost comes from the signed-in caller's own
        // reading history (see /api/stories), proven by their own session
        // token rather than a plain userId param anyone could pass in.
        // Demo mode and signed-out reading just skip this — Explore still
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

  useEffect(() => {
    setStories([]); setExpandedId(null);
    window.scrollTo({ top: 0 });
    // Following with nothing chosen shows a prompt instead of any (mock) stories.
    if (followingEmpty) { setLoading(false); return; }
    loadPage(0, tab, true);
  }, [tab, loadPage, followingEmpty]);

  // The same signal that ranks Explore, fetched once for display: the
  // "why this story" line on each card and the top recommendation both read
  // from this, so what's said and what's shown can never drift apart.
  useEffect(() => {
    if (tab !== 'following') return;
    let cancelled = false;
    loadEditorProfile().then((p) => { if (!cancelled) setEditorProfile(p); });
    return () => { cancelled = true; };
  }, [tab, loadEditorProfile]);

  // Watch is a full-screen feed: switch the document scroller off while it is
  // open so a flick can only move the feed. Two scrollers is what made a swipe
  // land halfway — the page took part of it before the feed took the rest.
  useEffect(() => {
    if (tab !== 'watch') return;
    document.documentElement.classList.add('watch-lock');
    return () => document.documentElement.classList.remove('watch-lock');
  }, [tab]);

  // News/For You snap to the next story only while an article is open — see
  // .feed-snap in globals.css for why this is `proximity`, not Watch's
  // `mandatory`. Cleared the moment the article closes, so ordinary
  // multi-card scrolling is completely free the rest of the time.
  useEffect(() => {
    if (tab === 'watch' || !expandedId) return;
    document.documentElement.classList.add('feed-snap');
    return () => document.documentElement.classList.remove('feed-snap');
  }, [tab, expandedId]);

  // Swipe anywhere to switch tabs. Deliberately reads only where a touch
  // started and ended, never mid-gesture — nothing visually "drags" with the
  // finger, and staying passive throughout means it can never steal a touch
  // from Watch's own vertical gesture or from a normal page scroll on News/
  // For You. A horizontal-dominant swipe past the threshold just steps to
  // the neighbouring tab once the finger lifts.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const TAB_ORDER: FeedTab[] = ['watch', 'news', 'following'];
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
      if (next >= 0 && next < TAB_ORDER.length) setTab(TAB_ORDER[next]);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [tab, shareStory, commentStory]);

  // Infinite scroll for News/Following (Watch handles its own)
  useEffect(() => {
    if (tab === 'watch') return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !loadingRef.current && !error) loadPage(page + 1, tab);
    }, { rootMargin: '900px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [page, tab, error, loadPage]);

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

  // The editor's one pick, not a second list: always the single top-ranked
  // Explore story specifically — index 0 stays the original first page's
  // top story even once infinite scroll appends more behind it, so this
  // doesn't re-nominate a new pick as later pages load in. It only shows up
  // at all when there's an honest reason to give (see explainRecommendation)
  // — no reason means no manufactured pick. The list below skips rendering
  // its collapsed card a second time, keeping this the single source for it.
  const recommendation = tab === 'following' && stories.length > 0
    ? (() => {
        const top = stories[0];
        const reason = reasonFor(top);
        return reason ? { story: top, reason } : null;
      })()
    : null;

  // The two snap points for .feed-snap: the open article itself and the
  // story right after it, so the scroll that carries you past the article
  // settles at the top of the next one instead of somewhere mid-card.
  const expandedIdx = expandedId ? stories.findIndex((s) => s.id === expandedId) : -1;
  const nextSnapId = expandedIdx >= 0 && expandedIdx + 1 < stories.length ? stories[expandedIdx + 1].id : null;

  const TabBtn = ({ id, label }: { id: FeedTab; label: string }) => (
    <button
      onClick={() => setTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`relative py-3.5 font-sans text-[16px] ${tab === id ? 'font-semibold text-ink' : 'text-muted'}`}
    >
      {label}
      {tab === id && <span className="absolute bottom-0 left-1/2 h-0.5 w-9 -translate-x-1/2 rounded-full bg-accent" />}
    </button>
  );

  return (
    /* On Watch the shell is a fixed-height flex column that clips its own
       overflow, so the feed inside it is the only thing on screen that
       scrolls. The other tabs scroll the page as normal. */
    <div ref={rootRef} className={tab === 'watch' ? 'watch-shell flex flex-col overflow-hidden' : undefined}>
      {/* Brand mark left, the three feeds grouped in the middle. The spacer
          matches the mark's width so the group sits centred on screen rather
          than nudged right by it. */}
      <header className="sticky top-0 z-30 shrink-0 border-b border-rule bg-paper/95 backdrop-blur-sm">
        <div className="flex items-center px-4">
          <Link href="/" aria-label="Inifini home" className="shrink-0">
            <Logo size={30} />
          </Link>
          <nav className="flex flex-1 items-center justify-center gap-7">
            <TabBtn id="watch" label="Watch" />
            <TabBtn id="news" label="News" />
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
           being floored at its content height and pushing the feed off-screen. */
        <div className="min-h-0 flex-1">
          {loading && stories.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted">Loading…</div>
          ) : (
            <WatchFeed stories={stories} onShare={(s) => setShareStory(s)} onNeedMore={() => loadPage(page + 1, 'watch')} />
          )}
        </div>
      ) : (
        /* NEWS / FOLLOWING TABS */
        <main className="px-4">
          {followingEmpty ? (
            <div className="mt-20 text-center">
              <p className="font-serif text-2xl font-semibold">Pick what you&rsquo;re into.</p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Choose the subjects and news outlets you care about. Everything they publish gathers here.</p>
              <Link href="/profile" className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Choose topics &amp; sources</Link>
            </div>
          ) : (
          <>
          {/* The editor's single pick comes first — before even the
              interests summary line — since it's the one thing on this tab
              meant to feel chosen rather than filtered. */}
          {recommendation && expandedId !== recommendation.story.id && (
            <div className="pt-6">
              <TodaysRecommendation
                story={recommendation.story}
                reason={recommendation.reason}
                showDemoTag={isDev}
                onOpen={openStory}
                onComment={() => setCommentStory(recommendation.story)}
                onShare={(st) => setShareStory(st)}
              />
            </div>
          )}

          {tab === 'following' && (interests.length > 0 || followedSources.size > 0) && (
            <p className="pt-3 text-[12px] text-muted">
              Following: {[...interests.map(categoryLabel), ...Array.from(followedSources)].join(' · ')} · <Link href="/profile" className="underline">Edit</Link>
            </p>
          )}

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
              <p className="mt-2 text-sm text-muted">{tab === 'following' ? 'Pick more topics or sources to fill this feed.' : 'No stories right now.'}</p>
              {tab === 'following' && <Link href="/profile" className="mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Edit topics &amp; sources</Link>}
            </div>
          )}

          <div className="space-y-9 pt-6">
            {stories.map((s, i) => {
              // Already shown above as the editor's pick — its collapsed
              // card doesn't also render here, only its expanded view does,
              // so opening it from the recommendation still works exactly
              // like any other story, just without a second copy sitting in
              // the ordinary list underneath.
              if (recommendation?.story.id === s.id && expandedId !== s.id) return null;
              const isSnapPoint = s.id === expandedId || s.id === nextSnapId;
              return (
              <div key={s.id} id={`story-${s.id}`} className={`scroll-mt-28${isSnapPoint ? ' feed-snap-point' : ''}`}>
                {expandedId === s.id ? (
                  <ArticleView story={s} related={relatedFor(s)} onClose={() => setExpandedId(null)} onOpen={openStory} onShare={(st) => setShareStory(st)} onComment={(st) => setCommentStory(st)} />
                ) : (
                  <StoryCard story={s} lead={i === 0} showDemoTag={isDev} reason={tab === 'following' ? reasonFor(s) : null} onOpen={openStory} onComment={() => setCommentStory(s)} onShare={(st) => setShareStory(st)} />
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
          </>
          )}
        </main>
      )}
    </div>
  );
}
