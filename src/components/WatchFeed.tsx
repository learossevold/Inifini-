'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Story } from '@/lib/types';
import { categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';
import Comments from './Comments';
import { useSession } from '@/lib/session';

/** Small stable hash, used to vary per-card motion without randomness on rerender. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

function CommentSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { addComment, commentsByStory, ensureComments } = useSession();
  useEffect(() => { ensureComments(story.id); }, [story.id, ensureComments]);
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
      <div className="relative flex h-[65vh] flex-col rounded-t-2xl bg-[#14152C] shadow-2xl animate-fadeUp">
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
              landscape image never leaves bars on a full-screen portrait card. */}
          <Image src={story.image_url!} alt="" fill sizes="100vw" aria-hidden
            className="scale-125 object-cover blur-2xl brightness-50" unoptimized />
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
    // Sized by its own content, not forced to any particular height — the
    // wrapper that scrolls it (see WatchFeed) is what reserves a full
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
        {showCommentSheet && <CommentSheet story={story} onClose={() => setShowCommentSheet(false)} />}

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
  const [activeIdx, setActiveIdx] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const [commentStory, setCommentStory] = useState<Story | null>(null);
  const [muted, setMuted] = useState(true);
  const { recordView } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTouchY = useRef(0);
  const redirectingRef = useRef(false);
  const velocitySamples = useRef<{ t: number; y: number }[]>([]);
  // True from the moment a boundary drag starts redirecting the outer
  // container through to the moment its coast+settle animation decides the
  // outcome. While true, the auto-close observer below defers to it — see
  // that observer for why racing the two was causing a mid-gesture glitch.
  const redirectActiveRef = useRef(false);

  // The article opens inline, in the same snap-scrolling container as the
  // cards, and every card slot — open or closed — is exactly one screen
  // tall and an ordinary scroll-snap-align: start point, always. That
  // uniformity is the whole design: two earlier attempts both broke on the
  // same underlying fact, that scroll-snap-type: mandatory actively
  // enforces its snap points, not just suggests them.
  //
  //  1. First, the open article WAS the snap point, but many times taller
  //     than a normal card. With mandatory, decelerating anywhere near a
  //     snap point coerces the rest position to its start — fine for a
  //     card-sized point, a large unwanted jump for one several screens
  //     tall. That's the "hopper til toppen" bug.
  //  2. Removing its snap-align entirely while open (so it became a plain
  //     free-scroll zone) looked right on paper, but mandatory doesn't
  //     tolerate resting at a position that stops being a valid snap point:
  //     the instant an open article lost its alignment, the browser
  //     immediately re-snapped to whatever the nearest valid point was —
  //     before you'd read a single line. Confirmed directly: toggling
  //     scroll-snap-align on a resting element with no scroll gesture at
  //     all still forces a jump.
  //
  // Keeping every slot uniformly sized sidesteps both: nothing about the
  // open article's slot ever looks different to the outer scroller, so
  // there's nothing for mandatory to fight. The article's own content
  // scrolls inside its slot in a plain overflow-y: auto div.
  //
  // Continuing to scroll past the article's end was meant to rely on plain
  // scroll chaining — the same browser behaviour that lets a dialog's
  // content fall through to the page once you hit its bottom — with no
  // script deciding when the handoff happens. That held up under wheel
  // events, but not under real touch on iOS: chaining out of a nested
  // touch-scrolled container isn't reliable there, so continuing to swipe
  // at the article's boundary just went nowhere.
  //
  // What's below detects that specific case — a swipe that starts and ends
  // at the article's own scroll boundary — and nudges the OUTER container
  // by one slot with scrollIntoView. It isn't simulating the transition:
  // the target is a perfectly ordinary uniform snap point, so the outer
  // container's own native mandatory-snap and smooth-scroll do the actual
  // animating, the same as they do for a plain card-to-card flick. The
  // script's only job is deciding *that* to move, not *how*.
  const open = useCallback((s: Story) => {
    setOpenId(s.id);
    recordView(s.id);
  }, [recordView]);

  // Every slot is the same height whether it holds a card or an article, so
  // closing never changes the outer container's layout — there's nothing to
  // correct or scroll back to.
  const close = useCallback(() => setOpenId(null), []);

  const openStory = openId ? stories.find((s) => s.id === openId) ?? null : null;

  // Every version of "continue scrolling past the article" up to this one
  // decided, at some threshold, to fire a scripted transition to the
  // neighbouring card — instant, then animated, then animated and better
  // timed. All of them still read as distinct from an ordinary card flick,
  // because none of them were actually tracking the finger: a normal scroll
  // moves 1:1 with your finger the whole time it's on the glass, and only
  // gets momentum and a snap once you let go. A threshold-triggered
  // animation, however well tuned, is a different mechanism wearing the
  // same clothes.
  //
  // This drives the outer container's scrollTop directly, in real time,
  // from the same touch sequence that's dragging the article — once that
  // drag reaches the article's own top or bottom edge and keeps going.
  // Below that edge, nothing here runs at all and the article scrolls
  // exactly as it always has. At the edge, control simply passes to the
  // outer container for the rest of the gesture, the same handoff a nested
  // scrollable gives you for free when the browser's own chaining works —
  // it just doesn't, reliably, for touch on iOS (confirmed directly, see
  // the removed 260ms-animation version's history). On release, a short
  // velocity-based coast plus a settle to the nearest card reproduces the
  // momentum and snap an ordinary flick gets natively.
  //
  // preventDefault on the article's own touchmove is what stops it from
  // also trying to rubber-band/scroll natively once redirect has taken
  // over — React attaches onTouchMove as a passive listener, where
  // preventDefault is silently ignored, so this has to be a real
  // addEventListener with { passive: false }.
  //
  // scroll-snap-type: mandatory turned out to fight this outright, not just
  // at rest: confirmed in isolation (a plain scrollTop += 5 in a loop, no
  // React involved) that with mandatory active, every single assignment
  // gets silently pulled straight back to the current nearest snap point —
  // scrollTop simply never left 0 no matter how many times or how slowly it
  // was incremented. The container's snap-type is switched off for the
  // duration of the drag and the settle animation below (which computes and
  // eases to the exact nearest card itself, so it doesn't need native snap
  // correction either), and restored once that animation lands exactly on
  // a valid snap coordinate — at which point re-enabling it is a no-op.
  const settleAfterRedirect = useCallback((initialVelocity: number, originalIndex: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cardHeight = container.clientHeight || 1;
    const maxIndex = stories.length - 1;

    const finish = () => {
      const nearest = Math.max(0, Math.min(maxIndex, Math.round(container.scrollTop / cardHeight)));
      const targetTop = nearest * cardHeight;
      const startTop = container.scrollTop;
      const distance = targetTop - startTop;
      // Closed only once settled, not left to the auto-close observer: by
      // the time that fires (or doesn't, for a script-driven scroll —
      // confirmed unreliable after scrollIntoView specifically), the article
      // would already need to look closed. Doing it here, right when the
      // code knows the transition is actually finished, avoids depending on
      // it for this path. The observer still covers the other case: an
      // article scrolled away by ordinary touch scrolling on the outer
      // container, which isn't driven by this at all.
      //
      // Only closing when the settle actually lands on a different card —
      // not just any settle — matters because a light nudge without enough
      // momentum settles right back to the same card it started on. That's
      // a "released before committing" gesture, same as a native scroll
      // that springs back, and should leave the article open exactly as it
      // was rather than closing it to the compact card.
      const settle = () => {
        container.style.scrollSnapType = ''; // back to the CSS class's mandatory
        redirectActiveRef.current = false;
        if (nearest !== originalIndex) setOpenId(null);
      };
      if (Math.abs(distance) < 1) { settle(); return; }
      const DURATION_MS = 200;
      const startTime = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / DURATION_MS);
        const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
        container.scrollTop = startTop + distance * eased;
        if (t < 1) { requestAnimationFrame(step); return; }
        settle();
      };
      requestAnimationFrame(step);
    };

    // px/ms, clamped so one noisy sample can't fling it wildly off.
    const v = Math.max(-3, Math.min(3, initialVelocity));
    if (Math.abs(v) < 0.15) { finish(); return; }
    const coast = (velocity: number) => {
      if (Math.abs(velocity) < 0.05) { finish(); return; }
      container.scrollTop += velocity * 16; // ~px per frame at 60fps
      requestAnimationFrame(() => coast(velocity * 0.94)); // friction
    };
    coast(v);
  }, [stories.length]);

  useEffect(() => {
    if (!openId) return;
    const scrollEl = document.getElementById(`watch-item-${openId}`)?.querySelector<HTMLElement>('.overflow-y-auto');
    if (!scrollEl) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      redirectingRef.current = false;
      redirectActiveRef.current = false;
      velocitySamples.current = [{ t: performance.now(), y: e.touches[0].clientY }];
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (!redirectingRef.current) {
        const startY = touchStartY.current;
        if (startY === null) return;
        const THRESHOLD = 24; // enough to distinguish intent from a small settling wobble
        if (Math.abs(startY - y) < THRESHOLD) { lastTouchY.current = y; return; }
        const atBottom = scrollEl.scrollTop + scrollEl.clientHeight >= scrollEl.scrollHeight - 2;
        const atTop = scrollEl.scrollTop <= 0;
        const goingDown = startY - y > 0;
        if (!((goingDown && atBottom) || (!goingDown && atTop))) { lastTouchY.current = y; return; }
        redirectingRef.current = true; // falls through to the redirect branch below for this same event
        redirectActiveRef.current = true; // see the ref's declaration for why
        const container = containerRef.current;
        if (container) container.style.scrollSnapType = 'none'; // see settleAfterRedirect for why
      }
      e.preventDefault();
      const container = containerRef.current;
      if (container) container.scrollTop += lastTouchY.current - y;
      lastTouchY.current = y;
      const samples = velocitySamples.current;
      samples.push({ t: performance.now(), y });
      if (samples.length > 5) samples.shift();
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
      if (!redirectingRef.current) return;
      redirectingRef.current = false;
      const samples = velocitySamples.current;
      let velocity = 0;
      if (samples.length >= 2) {
        const first = samples[0];
        const last = samples[samples.length - 1];
        const dt = last.t - first.t;
        if (dt > 0) velocity = (first.y - last.y) / dt; // px/ms, positive = finger moved up
      }
      const originalIndex = stories.findIndex((s) => s.id === openId);
      settleAfterRedirect(velocity, originalIndex);
    };

    scrollEl.addEventListener('touchstart', onTouchStart, { passive: true });
    scrollEl.addEventListener('touchmove', onTouchMove, { passive: false });
    scrollEl.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      scrollEl.removeEventListener('touchstart', onTouchStart);
      scrollEl.removeEventListener('touchmove', onTouchMove);
      scrollEl.removeEventListener('touchend', onTouchEnd);
    };
  }, [openId, settleAfterRedirect]);

  // Without this, scrolling an open article out of view by simply continuing
  // to scroll (rather than tapping close) would leave openId set forever:
  // nothing else ever clears it. That's not just untidy — active is gated on
  // !openId for every card, so every card's drift and audio would stay
  // paused for the rest of the session. A dedicated low-threshold observer
  // (not the shared 0.6 one below, which is tuned for deciding what counts
  // as "the" active card) closes it the moment it's fully scrolled past in
  // either direction.
  //
  // root has to be the scroll container itself, not the default (the page
  // viewport). Without it, an element sitting just below the sticky header
  // still counts as "intersecting" by page standards even though the header
  // visually covers it — a dead zone exactly one header's height tall where
  // this observer would never fire, leaving the article stuck open right at
  // the boundary a swipe was trying to scroll past.
  //
  // Deferring to redirectActiveRef while it's set matters because the live
  // boundary-drag above also drives this same container's scrollTop, which
  // this observer sees exactly the same as any other scroll. Without the
  // guard, a decisive drag could scroll the article's slot fully out of
  // view *before* the finger lifts, firing this mid-gesture: the article
  // unmounts on the spot, tearing out the touch listeners attached to its
  // now-gone scroll element and handing the rest of the same physical touch
  // sequence to whatever the browser does by default — which is exactly the
  // shake-then-drift-apart glitch this was producing. The redirect's own
  // settle logic is the sole decider of the outcome for as long as it's
  // active; this observer only needs to catch the case it doesn't drive at
  // all, an article scrolled away by some other means entirely.
  useEffect(() => {
    if (!openId) return;
    const el = document.getElementById(`watch-item-${openId}`);
    if (!el || !containerRef.current) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !redirectActiveRef.current) setOpenId(null);
    }, { root: containerRef.current, threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [openId]);

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
      { root: el, threshold: 0.6 }
    );
    cards.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [stories.length, onNeedMore]);

  return (
    <>
      <div
        ref={containerRef}
        className="snap-y-screen h-full overflow-y-auto no-scrollbar"
      >
        {stories.map((s, i) => (
          // snap-screen + h-full unconditionally, same for every slot
          // whether it's showing a card or an open article — see the note
          // above open() for why that uniformity is what makes this work.
          <div key={s.id} id={`watch-item-${s.id}`} data-watch-card data-idx={i} className="snap-screen relative h-full w-full overflow-hidden bg-night">
            {openId === s.id ? (
              // Touch handling for the boundary-swipe live-redirect lives in
              // a useEffect above, as a real (non-passive) addEventListener
              // on this element found by id — not JSX props here.
              <div className="h-full w-full overflow-y-auto no-scrollbar">
                <WatchArticle story={s} onClose={close} onShare={() => onShare(s)} />
              </div>
            ) : (
              <>
                {/* Drift and audio stop while any article is open, so nothing
                    moves or plays behind it once it's scrolled past. */}
                <WatchCard story={s} active={i === activeIdx && !openId} onOpen={() => open(s)} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
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
