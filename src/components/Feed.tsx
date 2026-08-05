'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FeedResponse, Story, FeedTab } from '@/lib/types';
import { useSession } from '@/lib/session';
import { supabaseBrowser } from '@/lib/supabase';
import StoryCard from './StoryCard';
import ArticleView from './ArticleView';
import WatchFeed from './WatchFeed';
import ShareSheet from './ShareSheet';
import CommentSheet from './CommentSheet';
import Logo from './Logo';
import { categoryLabel } from './ui';

export default function Feed() {
  const { interests, followedSources, recordView } = useSession();
  const [tab, setTab] = useState<FeedTab>('watch');
  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareStory, setShareStory] = useState<Story | null>(null);
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const [mode, setMode] = useState<'live' | 'mock'>('mock');
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
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

  // Watch is a full-screen feed: switch the document scroller off while it is
  // open so a flick can only move the feed. Two scrollers is what made a swipe
  // land halfway — the page took part of it before the feed took the rest.
  useEffect(() => {
    if (tab !== 'watch') return;
    document.documentElement.classList.add('watch-lock');
    return () => document.documentElement.classList.remove('watch-lock');
  }, [tab]);

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
    <div className={tab === 'watch' ? 'watch-shell flex flex-col overflow-hidden' : undefined}>
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
                so it reads as Explore: your interests plus the outlets you picked. */}
            <TabBtn id="following" label="Explore" />
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
            {stories.map((s, i) => (
              <div key={s.id} id={`story-${s.id}`} className="scroll-mt-28">
                {expandedId === s.id ? (
                  <ArticleView story={s} related={relatedFor(s)} onClose={() => setExpandedId(null)} onOpen={openStory} onShare={(st) => setShareStory(st)} onComment={(st) => setCommentStory(st)} />
                ) : (
                  <StoryCard story={s} lead={i === 0} showDemoTag={isDev} onOpen={openStory} onComment={() => setCommentStory(s)} onShare={(st) => setShareStory(st)} />
                )}
              </div>
            ))}
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
