'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Story } from '@/lib/types';
import { categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';
import Comments from './Comments';
import CommentSheet from './CommentSheet';
import SwipeFeed from './SwipeFeed';

/** Small stable hash, used to vary per-card motion without randomness on rerender. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Watch tab — the "see it" way of taking the news, as opposed to News's
 * "read it" (readers pick one or the other in Settings; see NewsMode).
 *
 * Collapsed: each story is a full-screen vertical "narrated summary" card —
 * hero image with a slow Ken Burns zoom (or category-tinted background) and the
 * short summary as large, sequential captions. This is explicitly a NARRATED
 * SUMMARY, never fake footage; the attribution label makes that clear.
 *
 * Tapping a card expands it into the full article — same dark aesthetic —
 * showing the complete summary, key points, why-it-matters, background,
 * what-next, comments and a link to the original. Tapping the hero image at the
 * top of the article collapses it back to the card. All of the scrolling,
 * snapping and swipe-out-of-an-article behaviour lives in SwipeFeed, which For
 * You runs on too.
 */

function WatchCard({
  story, active, onOpen, muted, onToggleMute,
}: {
  story: Story;
  active: boolean;
  onOpen: () => void;
  muted: boolean;
  onToggleMute: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [captionIdx, setCaptionIdx] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasAudio = story.audio_status === 'ready' && Boolean(story.audio_url);

  // Split the summary into short caption chunks
  const chunks = story.ai_short_summary
    .split(/(?<=[.,;])\s+/)
    .reduce<string[]>((acc, part) => {
      const last = acc[acc.length - 1];
      if (last && (last + ' ' + part).length < 60) acc[acc.length - 1] = last + ' ' + part;
      else acc.push(part);
      return acc;
    }, []);

  // Caption timing: synced to the real narration audio when available,
  // otherwise a fixed interval (silent caption cards).
  useEffect(() => {
    if (!active) { setCaptionIdx(0); return; }
    if (chunks.length === 0) return;

    if (hasAudio) {
      const a = audioRef.current;
      if (!a) return;
      const onTimeUpdate = () => {
        if (!a.duration) return;
        setCaptionIdx(Math.min(chunks.length - 1, Math.floor((a.currentTime / a.duration) * chunks.length)));
      };
      a.addEventListener('timeupdate', onTimeUpdate);
      return () => a.removeEventListener('timeupdate', onTimeUpdate);
    }

    const id = setInterval(() => setCaptionIdx((i) => (i + 1) % chunks.length), 2600);
    return () => clearInterval(id);
  }, [active, chunks.length, hasAudio]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) v.play().catch(() => {});
    else { v.pause(); v.currentTime = 0; }
  }, [active]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !hasAudio) return;
    if (active) { a.currentTime = 0; a.play().catch(() => {}); }
    else { a.pause(); a.currentTime = 0; }
  }, [active, hasAudio]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.muted = muted;
  }, [muted]);

  const hasVideo = story.video_status === 'ready' && story.video_url;
  const showImage = story.image_url && !imgFailed;

  // Stable per story, so a card keeps its move between renders while
  // neighbouring cards drift differently.
  const KEN_BURNS = ['animate-kenburns1', 'animate-kenburns2', 'animate-kenburns3', 'animate-kenburns4'];
  const kenBurns = KEN_BURNS[Math.abs(hashString(story.id)) % KEN_BURNS.length];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
      aria-label={`Open article: ${story.title}`}
      className="relative h-full w-full cursor-pointer overflow-hidden bg-night text-white"
    >
      {/* Background */}
      {hasVideo ? (
        <video ref={videoRef} src={story.video_url!} className="absolute inset-0 h-full w-full object-cover" muted loop playsInline />
      ) : showImage ? (
        <div className="absolute inset-0">
          {/* Blurred, over-scaled copy fills the frame behind the photo, so a
              landscape image never leaves bars on a full-screen portrait card.
              Same onError as the sharp copy below it: same src, so in
              practice both fail together, but only wiring one up meant a
              request that failed for this copy alone (a real possibility —
              two separate requests for the same URL aren't guaranteed to
              succeed or fail together) left a broken image sitting behind
              the sharp one with nothing catching it. */}
          <Image src={story.image_url!} alt="" fill sizes="100vw" aria-hidden
            className="scale-125 object-cover blur-2xl brightness-50"
            onError={() => setImgFailed(true)} unoptimized />
          <Image src={story.image_url!} alt="" fill sizes="100vw"
            /* The animation class is applied always, never toggled. Adding it
               used to snap the image straight from scale(1) to the keyframe's
               starting scale, and removing it snapped back, so every card
               visibly popped as it scrolled past. Only the play state changes
               now: pausing freezes the drift where it stands, and resuming
               carries on from the same frame, so nothing ever jumps. */
            className={`object-cover ${kenBurns} ${active ? '' : 'anim-paused'}`}
            onError={() => setImgFailed(true)} unoptimized />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E2043] to-night" aria-hidden />
      )}
      {/* Weighted to the bottom, where the headline sits — the photo itself
          stays vivid rather than being dimmed flat. */}
      <div className="absolute inset-0 bg-gradient-to-t from-night via-night/45 via-40% to-transparent" aria-hidden />

      {hasAudio && <audio ref={audioRef} src={story.audio_url!} preload={active ? 'auto' : 'none'} />}

      {/* Category + live tag */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">{categoryLabel(story.category)}</span>
        {!hasVideo && <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white/70 backdrop-blur-sm">AI narration</span>}
      </div>

      {hasAudio && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          aria-label={muted ? 'Unmute narration' : 'Mute narration'}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm"
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M18.5 5.5a9 9 0 0 1 0 13" /></svg>
          )}
        </button>
      )}

      {/* Headline + animated captions. pr-16, not the p-5 all sides this used
          to have — the vertical like/comment/save/share column (rendered by
          the caller, absolutely positioned at bottom-32 right-3, see
          WatchFeed below) sits over this same corner, and a headline or
          caption long enough to wrap was landing its last word or two
          directly under those icons with nothing here aware they existed.
          Confirmed on real mock headlines at 375px width — a 2-line
          headline already touched the save icon, a 3-line one ran straight
          through the comment icon. 64px clears the icon column's own
          right-3-plus-22px-wide box with room to spare, on every line, not
          just the ones a particular headline happens to wrap short. */}
      <div className="absolute inset-x-0 bottom-0 py-5 pb-8 pl-5 pr-16">
        {/* Sized down from 26px so the caption underneath — the actual pitch
            for tapping through — doesn't read as an afterthought next to it. */}
        <h2 className="font-serif text-[22px] font-bold leading-[1.12]">{story.title}</h2>
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
    // Sized by its own content, not forced to any particular height — the
    // wrapper that scrolls it (see SwipeFeed) is what reserves a full
    // screen's worth of space regardless of how short or tall this is.
    <article className="w-full bg-night text-white">
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#1E2043] to-night" aria-hidden />
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
        {showCommentSheet && <CommentSheet story={story} onClose={() => setShowCommentSheet(false)} dark />}

        <a href={story.original_url} target="_blank" rel="noopener noreferrer"
          className="mt-7 flex items-center justify-between rounded-md border border-white/15 bg-white/5 px-4 py-3.5 font-sans text-[14px] font-medium active:bg-white/10">
          <span>Read the original at <span className="font-semibold">{story.source_name}</span></span>
          <span aria-hidden>→</span>
        </a>
        <p className="mt-2 text-[11px] font-sans text-white/45">AI-assisted summary. {story.source_name} is the source of record.</p>
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
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const [muted, setMuted] = useState(true);

  return (
    <>
      <SwipeFeed
        stories={stories}
        onNeedMore={onNeedMore}
        slotClassName="bg-night"
        renderCard={(s, { active, open }) => (
          <>
            <WatchCard story={s} active={active} onOpen={open} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
            <div className="absolute bottom-32 right-3 z-10">
              <EngagementBar story={s} vertical dark onComment={() => setCommentStory(s)} onShare={() => onShare(s)} />
            </div>
          </>
        )}
        renderArticle={(s, { close }) => <WatchArticle story={s} onClose={close} onShare={() => onShare(s)} />}
      />

      {commentStory && <CommentSheet story={commentStory} onClose={() => setCommentStory(null)} dark />}
    </>
  );
}
