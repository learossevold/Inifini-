'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FeedResponse, Story, FeedTab } from '@/lib/types';
import { useSession } from '@/lib/session';
import StoryCard from './StoryCard';
import ArticleView from './ArticleView';
import WatchFeed from './WatchFeed';
import ShareSheet from './ShareSheet';
import Logo from './Logo';
import { categoryLabel } from './ui';

export default function Feed() {
  const { interests } = useSession();
  const [tab, setTab] = useState<FeedTab>('watch');
  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shareStory, setShareStory] = useState<Story | null>(null);
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
      if (t === 'following') params.set('interests', interests.join(','));
      const res = await fetch(`/api/stories?${params}`);
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
  }, [interests]);

  const followingEmpty = tab === 'following' && interests.length === 0;

  useEffect(() => {
    setStories([]); setExpandedId(null);
    window.scrollTo({ top: 0 });
    // Following with no interests shows a prompt instead of any (mock) stories.
    if (tab === 'following' && interests.length === 0) { setLoading(false); return; }
    loadPage(0, tab, true);
  }, [tab, loadPage, interests.length]);

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

  const openStory = useCallback((s: Story) => {
    setExpandedId(s.id);
    requestAnimationFrame(() => document.getElementById(`story-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, []);

  const relatedFor = useCallback((s: Story) => stories.filter((x) => x.id !== s.id && (x.category === s.category || x.region === s.region)).slice(0, 3), [stories]);

  const TabBtn = ({ id, label }: { id: FeedTab; label: string }) => (
    <button onClick={() => setTab(id)} className={`relative py-1 font-sans text-[15px] ${tab === id ? 'font-semibold text-ink' : 'text-muted'}`}>
      {label}
      {tab === id && <span className="absolute inset-x-0 -bottom-[13px] h-0.5 rounded-full bg-accent" />}
    </button>
  );

  return (
    <div>
      {/* Masthead: logo left, tabs beside it (Watch first) */}
      <header className="sticky top-0 z-30 border-b border-rule bg-paper/95 backdrop-blur-sm">
        <div className="flex items-center gap-4 px-4 py-3">
          <Link href="/" aria-label="Inifini home" className="shrink-0">
            <Logo size={30} />
          </Link>
          <nav className="flex items-center gap-6">
            <TabBtn id="watch" label="Watch" />
            <TabBtn id="news" label="News" />
            <TabBtn id="following" label="Following" />
          </nav>
        </div>
      </header>

      {shareStory && <ShareSheet story={shareStory} onClose={() => setShareStory(null)} />}

      {/* WATCH TAB */}
      {tab === 'watch' ? (
        loading && stories.length === 0 ? (
          <div className="flex h-[calc(100vh-7.5rem)] items-center justify-center text-muted">Loading…</div>
        ) : (
          <WatchFeed stories={stories} onShare={(s) => setShareStory(s)} onNeedMore={() => loadPage(page + 1, 'watch')} />
        )
      ) : (
        /* NEWS / FOLLOWING TABS */
        <main className="px-4">
          {followingEmpty ? (
            <div className="mt-20 text-center">
              <p className="font-serif text-2xl font-semibold">Follow topics to personalize your feed.</p>
              <p className="mx-auto mt-3 max-w-xs text-sm text-muted">Choose the subjects you care about and stories about them will gather here.</p>
              <Link href="/profile" className="mt-6 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Choose topics</Link>
            </div>
          ) : (
          <>
          {tab === 'following' && interests.length > 0 && (
            <p className="pt-3 text-[12px] text-muted">
              Following: {interests.map(categoryLabel).join(' · ')} · <Link href="/profile" className="underline">Edit</Link>
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
              <p className="mt-2 text-sm text-muted">{tab === 'following' ? 'Pick more interests to fill this feed.' : 'No stories right now.'}</p>
              {tab === 'following' && <Link href="/profile" className="mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Edit interests</Link>}
            </div>
          )}

          <div className="space-y-9 pt-6">
            {stories.map((s, i) => (
              <div key={s.id} id={`story-${s.id}`} className="scroll-mt-28">
                {expandedId === s.id ? (
                  <ArticleView story={s} related={relatedFor(s)} onClose={() => setExpandedId(null)} onOpen={openStory} onShare={(st) => setShareStory(st)} />
                ) : (
                  <StoryCard story={s} lead={i === 0} showDemoTag={isDev} onOpen={openStory} onComment={openStory} onShare={(st) => setShareStory(st)} />
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
