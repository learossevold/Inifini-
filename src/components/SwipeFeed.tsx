'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';

/**
 * The full-screen, one-story-per-screen swipe feed.
 *
 * This is the scroll engine only — it owns the snap container, which story is
 * active, which one is expanded into its article, and the whole boundary-swipe
 * handoff that lets a single continuous drag carry you out of an open article
 * and on to the next story. What a card or an article actually *looks like* is
 * entirely the caller's: Watch renders dark narrated cards, For You renders
 * light editorial ones, and both get identical motion because both run through
 * here rather than each reimplementing it.
 *
 * `leading` is an optional extra full-screen slot before the first story — For
 * You uses it for the editor's greeting page. It participates in snapping like
 * any other slot, which is why every index below is a *slot* index and stories
 * are offset by one whenever it's present.
 */

export interface SwipeCardOpts {
  /** This slot is the one on screen — start drift/audio, pause everything else. */
  active: boolean;
  /** Expand this story into its article, in place, in the same slot. */
  open: () => void;
  /** Position among the stories (not slots), so the first can be styled as the lead. */
  index: number;
}

export default function SwipeFeed({
  stories, onNeedMore, leading, slotClassName, renderCard, renderArticle,
}: {
  stories: Story[];
  onNeedMore: () => void;
  leading?: ReactNode;
  /** Background for each slot, so a slot never flashes the page behind it mid-scroll. */
  slotClassName: string;
  renderCard: (story: Story, opts: SwipeCardOpts) => ReactNode;
  renderArticle: (story: Story, opts: { close: () => void }) => ReactNode;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const { recordView } = useSession();
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);
  const lastTouchY = useRef(0);
  const redirectingRef = useRef(false);
  const velocitySamples = useRef<{ t: number; y: number }[]>([]);
  // The article's own scrollTop, as last observed on a touchmove — see the
  // boundary check in onTouchMove below for why this exists.
  const lastScrollElTop = useRef(0);
  // True from the moment a boundary drag starts redirecting the outer
  // container through to the moment its coast+settle animation decides the
  // outcome. While true, the auto-close observer below defers to it — see
  // that observer for why racing the two was causing a mid-gesture glitch.
  const redirectActiveRef = useRef(false);

  // Slots ahead of the first story (the greeting page, when there is one).
  const offset = leading ? 1 : 0;
  const slotCount = stories.length + offset;

  // The article opens inline, in the same snap-scrolling container as the
  // cards, and every slot — card, article or greeting — is exactly one screen
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
  // at the article's own scroll boundary — and drives the OUTER container by
  // one slot itself. It isn't simulating the transition: the target is a
  // perfectly ordinary uniform snap point, so the settle lands exactly where
  // native mandatory-snap would have, the same as a plain card-to-card flick.
  const open = useCallback((s: Story) => {
    setOpenId(s.id);
    recordView(s.id);
  }, [recordView]);

  // Every slot is the same height whether it holds a card or an article, so
  // closing never changes the outer container's layout — there's nothing to
  // correct or scroll back to.
  const close = useCallback(() => setOpenId(null), []);

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
  // Which card to land on is decided once, right here, the same way any
  // native swipeable view decides it — not by hand-simulating the
  // browser's own momentum curve first and letting wherever that lands
  // decide. That two-step version (coast the actual pixels by a made-up
  // friction constant, *then* look at where it ended up) was the bug: a
  // real fling is released well before it's travelled anywhere near its
  // eventual distance, because the finger commits by speed, not distance —
  // the deceleration afterwards is the browser's, not something this code
  // was ever going to reproduce by guessing a decay constant. Our decay was
  // short of that in practice, so a normal-speed swipe fell short of the
  // halfway point, sprang back, and needed a second swipe to actually
  // advance — plus the coast-then-settle sequence stacked two separate
  // animations back to back, reading as slow next to a native single snap.
  //
  // So: an ordinary flick commits to the next card immediately, by speed
  // alone, exactly like a native scroll-snap fling does. Anything slower
  // instead goes by how far past the halfway mark it's actually been
  // dragged. Either way there's exactly one animation from here to the
  // decided card, at a fixed native-feeling duration — no separate coast.
  const settleAfterRedirect = useCallback((initialVelocity: number, originalIndex: number) => {
    const container = containerRef.current;
    if (!container) return;
    const cardHeight = container.clientHeight || 1;
    const maxIndex = slotCount - 1;

    const originalTop = originalIndex * cardHeight;
    const dragDistance = container.scrollTop - originalTop;
    const VELOCITY_COMMIT = 0.35; // px/ms — an ordinary flick, not a maximal one
    let targetIndex = originalIndex;
    if (Math.abs(initialVelocity) > VELOCITY_COMMIT) {
      targetIndex = originalIndex + (initialVelocity > 0 ? 1 : -1);
    } else if (Math.abs(dragDistance) > cardHeight / 2) {
      targetIndex = originalIndex + (dragDistance > 0 ? 1 : -1);
    }
    targetIndex = Math.max(0, Math.min(maxIndex, targetIndex));

    const targetTop = targetIndex * cardHeight;
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
    // Only closing when the target is actually a different card — not just
    // any settle — matters because a slow, short drag lands back on the
    // same card it started on. That's a "released before committing"
    // gesture, same as a native scroll that springs back, and should leave
    // the article open exactly as it was rather than closing it to the
    // compact card.
    const settle = () => {
      container.style.scrollSnapType = ''; // back to the CSS class's mandatory
      redirectActiveRef.current = false;
      if (targetIndex !== originalIndex) setOpenId(null);
    };
    if (Math.abs(distance) < 1) { settle(); return; }
    const DURATION_MS = 240;
    const startTime = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / DURATION_MS);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      container.scrollTop = startTop + distance * eased;
      if (t < 1) { requestAnimationFrame(step); return; }
      settle();
    };
    requestAnimationFrame(step);
  }, [slotCount]);

  useEffect(() => {
    if (!openId) return;
    // Found by data attribute rather than a global element id, so two of
    // these feeds can coexist without their ids colliding.
    const scrollEl = containerRef.current?.querySelector<HTMLElement>('[data-open-slot] .overflow-y-auto');
    if (!scrollEl) return;

    const onTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      lastTouchY.current = e.touches[0].clientY;
      redirectingRef.current = false;
      redirectActiveRef.current = false;
      lastScrollElTop.current = scrollEl.scrollTop;
      velocitySamples.current = [{ t: performance.now(), y: e.touches[0].clientY }];
    };

    const onTouchMove = (e: TouchEvent) => {
      const y = e.touches[0].clientY;
      if (!redirectingRef.current) {
        const startY = touchStartY.current;
        if (startY === null) return;
        // Small, not the ~24px it used to be: this measures from the whole
        // gesture's start, not from the moment the boundary was actually
        // reached, so when a swipe starts already resting at the article's
        // edge — the ordinary "keep scrolling in the same motion" case —
        // every pixel of this threshold was dead time with nothing on
        // screen moving at all (article already maxed, redirect not yet
        // armed). Confirmed directly: instrumenting both scrollTops during
        // a slow drag from rest showed zero movement anywhere for the first
        // 24px of finger travel, then a sudden start — exactly the
        // stutter being reported. Small enough now to be below one frame's
        // worth of perceptible delay, while still filtering out sub-pixel
        // jitter that shouldn't arm it on its own (e.g. during a tap).
        const THRESHOLD = 4;
        if (Math.abs(startY - y) < THRESHOLD) { lastTouchY.current = y; return; }

        // Not a plain "is scrollTop already sitting exactly at its max"
        // check. That worked for every synthetic test, which all start the
        // gesture already resting at the boundary — but a real read (start
        // at the top, drag continuously through the whole article and past
        // its own edge in one motion) never got as far as arming at all,
        // reproduced directly by driving the same drag through Chromium's
        // real touch-input pipeline (CDP), not just dispatched DOM events.
        // scrollTop is a synchronous DOM read and shouldn't lag by spec,
        // but native touch scrolling on iOS is known to run its position
        // updates off the main thread for performance, and a synchronous
        // read from inside a touchmove handler can observe a value a frame
        // or so behind the true visual position — worst right as a fast
        // drag reaches the end, exactly the moment this needs to be right.
        //
        // So the edge itself is checked with a forgiving margin instead of
        // exact equality, and combined with a second, purely behavioural
        // signal: the finger is still visibly dragging in this direction,
        // but the article stopped moving in response. That second signal
        // alone would be too eager — a natural pause mid-scroll looks
        // identical for one frame — so it only counts alongside actually
        // being near the edge, never on its own.
        const currentScrollElTop = scrollEl.scrollTop;
        const scrollElDelta = currentScrollElTop - lastScrollElTop.current;
        const fingerDelta = lastTouchY.current - y; // px since the last check; positive = dragging up = wants more content below
        lastScrollElTop.current = currentScrollElTop;

        const EDGE_MARGIN = 24; // forgiving on purpose — see above
        const nearBottom = currentScrollElTop + scrollEl.clientHeight >= scrollEl.scrollHeight - EDGE_MARGIN;
        const nearTop = currentScrollElTop <= EDGE_MARGIN;
        const stillDragging = Math.abs(fingerDelta) > 0.5;
        const notResponding = Math.abs(scrollElDelta) < 0.5;
        const goingDown = startY - y > 0;
        const atBottom = nearBottom && goingDown && stillDragging && notResponding;
        const atTop = nearTop && !goingDown && stillDragging && notResponding;
        if (!(atBottom || atTop)) { lastTouchY.current = y; return; }
        redirectingRef.current = true; // falls through to the redirect branch below for this same event
        redirectActiveRef.current = true; // see the ref's declaration for why
        const container = containerRef.current;
        if (container) container.style.scrollSnapType = 'none'; // see settleAfterRedirect for why
        // Velocity is measured only from here on, not from the original
        // touchstart: a finger can rest on the article for a while (reading,
        // or the small pre-arm wobble) before the actual continue-scrolling
        // motion begins, and that whole idle stretch was staying in the
        // window as its oldest sample until enough later samples pushed it
        // out — which a short, decisive swipe often never does within only
        // 5 samples. That stale sample diluted dt, so even a genuinely fast
        // swipe measured as slow, fell under the commit threshold, and
        // sprang back — reading as "the first swipe hops, then a second one
        // finally works." Resetting the window right as the redirect arms
        // means it only ever reflects the swipe that's actually happening.
        velocitySamples.current = [{ t: performance.now(), y }];
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
      const originalIndex = stories.findIndex((s) => s.id === openId) + offset;
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
    // `stories` is read only inside the handlers, at gesture time — leaving it
    // out of the deps keeps a background page-append from tearing down and
    // reattaching these listeners in the middle of a live drag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId, offset, settleAfterRedirect]);

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
    if (!openId || !containerRef.current) return;
    const el = containerRef.current.querySelector('[data-open-slot]');
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting && !redirectActiveRef.current) setOpenId(null);
    }, { root: containerRef.current, threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [openId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const slots = Array.from(el.querySelectorAll('[data-swipe-slot]'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
            if (idx - offset >= stories.length - 3) onNeedMore();
          }
        });
      },
      { root: el, threshold: 0.6 }
    );
    slots.forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, [stories.length, offset, onNeedMore]);

  const slot = (key: string, idx: number, children: ReactNode, extra?: Record<string, string>) => (
    // snap-screen + h-full unconditionally, same for every slot whether it's
    // showing a card, an open article or the greeting page — see the note
    // above open() for why that uniformity is what makes this work.
    <div
      key={key}
      data-swipe-slot
      data-idx={idx}
      {...extra}
      className={`snap-screen relative h-full w-full overflow-hidden ${slotClassName}`}
    >
      {children}
    </div>
  );

  return (
    <div ref={containerRef} className="snap-y-screen h-full overflow-y-auto no-scrollbar">
      {leading && slot('leading', 0, leading)}
      {stories.map((s, i) =>
        slot(
          s.id,
          i + offset,
          openId === s.id ? (
            // Touch handling for the boundary-swipe live-redirect lives in a
            // useEffect above, as a real (non-passive) addEventListener on
            // this element found by data attribute — not JSX props here.
            //
            // overscroll-y-none matters specifically on real iOS Safari,
            // invisible in every synthetic-touch test this was verified
            // with: without it, the instant a drag passes this div's own
            // scroll edge, iOS's native elastic rubber-band can take over
            // the gesture with its own bounce animation before the JS
            // threshold below ever gets a chance to arm the redirect —
            // consuming the whole first swipe on a bounce that snaps back
            // by itself, with the boundary-swipe only successfully arming
            // on a second attempt once the element is back at a clean rest
            // position. This turns that native bounce off entirely, so
            // every pixel of the drag past the edge is this code's to read
            // from the first swipe, not the browser's to animate.
            <div className="h-full w-full overflow-y-auto overscroll-y-none no-scrollbar">
              {renderArticle(s, { close })}
            </div>
          ) : (
            // Drift and audio stop while any article is open, so nothing
            // moves or plays behind it once it's scrolled past.
            renderCard(s, { active: i + offset === activeIdx && !openId, open: () => open(s), index: i })
          ),
          openId === s.id ? { 'data-open-slot': '' } : undefined
        )
      )}
    </div>
  );
}
