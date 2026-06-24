'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Story } from '@/lib/types';
import { categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';
import Comments from './Comments';
import { useSession } from '@/lib/session';

function CommentSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { addComment, commentsByStory } = useSession();
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const comments = commentsByStory[story.id] ?? [];

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment(story.id, trimmed, null);
    setText('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* semi-transparent backdrop — tap to close */}
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close comments" />

      {/* sheet — 65 vh, dark, rounded top */}
      <div className="relative flex h-[65vh] flex-col rounded-t-2xl bg-[#181818] shadow-2xl animate-fadeUp">
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className="font-sans text-[13px] font-semibold text-white/70">
            {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Comments'}
          </span>
          <button onClick={onClose} className="text-white/50 text-lg leading-none">✕</button>
        </div>

        {/* comment list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {comments.length === 0 ? (
            <p className="pt-8 text-center text-[14px] text-white/40">No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-[11px] font-bold text-white">
                  {(c.author?.display_name || c.author?.username || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/80">{c.author?.display_name || c.author?.username}</p>
                  <p className="text-[14px] text-white/90 leading-snug">{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* input row */}
        <div className="border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[14px] text-white placeholder:text-white/35 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-35"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Watch tab.
 *
 * Collapsed: each story is a full-screen vertical "narrated summary" card —
 * hero image with a slow Ken Burns zoom (or category-tinted background) and the
 * short summary as large, sequential captions. This is explicitly a NARRATED
 * SUMMARY, never fake footage; the attribution label makes that clear.
 *
 * Tapping a card expands it into the full article — same dark aesthetic —
 * showing the complete summary, key points, why-it-matters, background,
 * what-next, comments and a link to the original. Tapping the hero image at the
 * top of the article collapses it back to the card. Snap scrolling stays on
 * throughout: between cards and after an expanded article.
 */

function WatchCard({ story, active, onOpen }: { story: Story; active: boolean; onOpen: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Split the summary into short caption chunks
  const chunks = story.ai_short_summary
    .split(/(?<=[.,;])\s+/)
    .reduce<string[]>((acc, part) => {
      const last = acc[acc.length - 1];
      if (last && (last + ' ' + part).length < 60) acc[acc.length - 1] = last + ' ' + part;
      else acc.push(part);
      return acc;
    }, []);

  useEffect(() => {
    if (!active) { setCaptionIdx(0); return; }
    if (chunks.length === 0) return;
    const id = setInterval(() => setCaptionIdx((i) => (i + 1) % chunks.length), 2600);
    return () => clearInterval(id);
  }, [active, chunks.length]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [active]);

  const hasVideo = story.video_status === 'ready' && story.video_url;
  const showImage = story.image_url && !imgFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Open article: ${story.title}`}
      className="snap-screen relative h-[calc(100vh-7.5rem)] w-full cursor-pointer overflow-hidden bg-night text-white"
    >
      {/* Background */}
      {hasVideo ? (
        <video ref={videoRef} src={story.video_url!} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline />
      ) : showImage ? (
        <div className="absolute inset-0">
          <Image src={story.image_url!} alt="" fill sizes="448px" className={`object-cover opacity-70 ${active ? 'animate-kenburns' : ''}`} onError={() => setImgFailed(true)} unoptimized />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2622] to-night" aria-hidden />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/30 to-night/60" aria-hidden />

      {/* Category + live tag */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">{categoryLabel(story.category)}</span>
        {!hasVideo && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur-sm">AI narration</span>}
      </div>

      {/* Headline + animated captions */}
      <div className="absolute inset-x-0 bottom-0 p-5 pb-8">
        <h2 className="font-serif text-[26px] font-bold leading-[1.12]">{story.title}</h2>
        <div className="mt-3 min-h-[3.5rem]">
          <p key={captionIdx} className="animate-fadeUp font-sans text-[17px] font-medium leading-snug text-white/95">{chunks[captionIdx]}</p>
        </div>
        {/* caption progress dots */}
        <div className="mt-3 flex gap-1.5" aria-hidden>
          {chunks.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i <= captionIdx ? 'bg-white' : 'bg-white/25'}`} />)}
        </div>
        <span className="mt-3 inline-block text-[12px] text-white/70">Tap to read the full story →</span>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">{label}</h3>
      <div className="mt-2 font-serif text-[17px] leading-relaxed text-white/90">{children}</div>
    </section>
  );
}

function WatchArticle({
  story, onClose, onShare,
}: {
  story: Story;
  onClose: () => void;
  onShare: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const date = new Date(story.published_at);
  const showImage = story.image_url && !imgFailed;

  return (
    <article className="snap-screen min-h-[calc(100vh-7.5rem)] w-full bg-night text-white">
      {/* Hero image (landscape, top) — tap to close back to the card */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close article"
        className="relative block aspect-[16/9] w-full overflow-hidden bg-black/40"
      >
        {showImage ? (
          <Image src={story.image_url!} alt="" fill sizes="448px" className="object-cover" onError={() => setImgFailed(true)} unoptimized />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2622] to-night" aria-hidden />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-night/30" aria-hidden />
      </button>

      <div className="px-5 pb-20 pt-5">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{categoryLabel(story.category)}</span>
        <h1 className="mt-2 font-serif text-[27px] font-bold leading-[1.12]">{story.title}</h1>
        <p className="mt-3 text-[12px] font-sans text-white/55">
          {story.source_name} · {date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({timeAgo(story.published_at)} ago)
        </p>

        <div className="mt-4">
          <EngagementBar story={story} dark onComment={() => setShowCommentSheet(true)} onShare={onShare} />
        </div>

        <p className="mt-5 font-serif text-[19px] leading-relaxed text-white/95">{story.ai_medium_summary}</p>

        <Section label="What to know">
          <ul className="space-y-2">
            {story.ai_key_points.map((p, i) => (
              <li key={i} className="flex gap-3"><span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-white/50" aria-hidden /><span>{p}</span></li>
            ))}
          </ul>
        </Section>
        <Section label="Why this matters">{story.ai_why_it_matters}</Section>
        <Section label="Background">{story.ai_background}</Section>
        <Section label="What may happen next">{story.ai_what_next}</Section>

        <Comments story={story} dark />
        {showCommentSheet && <CommentSheet story={story} onClose={() => setShowCommentSheet(false)} />}

        <a href={story.original_url} target="_blank" rel="noopener noreferrer"
          className="mt-7 flex items-center justify-between rounded-md border border-white/15 bg-white/5 px-4 py-3.5 font-sans text-[14px] font-medium active:bg-white/10">
          <span>Read the original at <span className="font-semibold">{story.source_name}</span></span>
          <span aria-hidden>→</span>
        </a>
        <p className="mt-2 text-[11px] font-sans text-white/45">AI-assisted summary based on the public feed excerpt. May contain errors — the original reporting is the source of record.</p>
      </div>
    </article>
  );
}

export default function WatchFeed({
  stories, onShare, onNeedMore,
}: {
  stories: Story[];
  onShare: (s: Story) => void;
  onNeedMore: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const scrollItemToTop = useCallback((id: string) => {
    requestAnimationFrame(() => {
      document.getElementById(`watch-item-${id}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, []);

  const open = useCallback((s: Story) => {
    setOpenId(s.id);
    scrollItemToTop(s.id);
  }, [scrollItemToTop]);

  const close = useCallback((s: Story) => {
    setOpenId((cur) => (cur === s.id ? null : cur));
    scrollItemToTop(s.id);
  }, [scrollItemToTop]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cards = Array.from(el.querySelectorAll('[data-watch-card]'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
            if (idx >= stories.length - 3) onNeedMore();
          }
        });
      },
      { threshold: 0.6 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [stories.length, onNeedMore]);

  return (
    <>
      <div ref={containerRef} className="snap-y-screen h-[calc(100vh-7.5rem)] overflow-y-auto no-scrollbar">
        {stories.map((s, i) => (
          <div key={s.id} id={`watch-item-${s.id}`} data-watch-card data-idx={i} className="relative">
            {openId === s.id ? (
              <WatchArticle story={s} onClose={() => close(s)} onShare={() => onShare(s)} />
            ) : (
              <>
                <WatchCard story={s} active={i === activeIdx} onOpen={() => open(s)} />
                {/* Right-side vertical engagement rail */}
                <div className="absolute bottom-32 right-3 z-10">
                  <EngagementBar story={s} vertical dark onComment={() => setCommentStory(s)} onShare={() => onShare(s)} />
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {commentStory && <CommentSheet story={commentStory} onClose={() => setCommentStory(null)} />}
    </>
  );
}
