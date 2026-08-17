'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { Story } from '@/lib/types';
import { Greeting } from '@/lib/greeting';
import { readingTimeMinutes } from '@/lib/ranking';
import { ImportanceMarker, categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';
import Comments from './Comments';
import CommentSheet from './CommentSheet';
import SwipeFeed from './SwipeFeed';

/**
 * For You — the same one-screen-per-story swipe as Watch (same engine, see
 * SwipeFeed), in the paper palette the tab has always had: white, ink and
 * signal blue rather than Watch's night. Watch is for *seeing* the news; this
 * is still the reading tab, so nothing here is dimmed, tinted or laid over a
 * photo — the page just happens to turn one story at a time.
 *
 * The first page is the editor's greeting, given a whole screen of its own
 * rather than a line above the first card: it's the one moment in the app
 * where the editor addresses the reader directly, and it used to scroll away
 * before it had been read.
 */

function GreetingPage({ greeting, following }: { greeting: Greeting; following: string[] }) {
  return (
    // pb-16 against justify-center on purpose: optically centred sits a little
    // above true centre, and the swipe hint needs room beneath it to read as
    // pointing somewhere rather than as the last line of the block.
    <div className="flex h-full w-full flex-col justify-center bg-paper px-7 pb-16 text-ink">
      <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Your AI editor</p>
      {/* The whole reason this page exists: said once, at full size, with
          nothing else competing for the screen. */}
      <h1 className="mt-4 font-serif text-[40px] font-bold leading-[1.06] tracking-[-0.02em]">
        {greeting.salutation}
      </h1>
      <p className="mt-5 font-serif text-[20px] leading-relaxed text-ink/80">{greeting.message}</p>

      {following.length > 0 && (
        <p className="mt-7 text-[12px] leading-relaxed text-muted">
          Following: {following.join(' · ')} · <Link href="/profile" className="underline">Edit</Link>
        </p>
      )}

      <div className="mt-10 flex items-center gap-2.5 text-muted">
        <span className="animate-swipeHint" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" /><path d="m5 12 7-7 7 7" />
          </svg>
        </span>
        <span className="font-sans text-[13px]">Swipe up for today&rsquo;s stories</span>
      </div>
    </div>
  );
}

function ForYouCard({
  story, isPick, reason, showDemoTag, onOpen, onComment, onShare,
}: {
  story: Story;
  /** The editor's single pick — the only card that gets the chosen-for-you frame. */
  isPick: boolean;
  reason: string | null;
  showDemoTag: boolean;
  onOpen: () => void;
  onComment: () => void;
  onShare: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = story.image_url && !imgFailed;

  return (
    <div className="flex h-full w-full flex-col bg-paper px-5 pb-5 pt-4 text-ink">
      <div className="flex items-center gap-2.5 text-[11px] font-sans uppercase tracking-[0.14em] text-muted">
        <span className="font-semibold text-ink">{categoryLabel(story.category)}</span>
        <ImportanceMarker story={story} />
        {showDemoTag && story.is_demo && <span className="rounded-sm bg-accentSoft px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-accent">DEMO</span>}
        {isPick && (
          <span className="ml-auto flex items-center gap-1 text-accent">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 3l2.1 5.3L20 9.6l-4 4.1.9 5.9L12 16.9 7.1 19.6l.9-5.9-4-4.1 5.9-1.3z" />
            </svg>
            <span className="font-semibold tracking-[0.18em]">Today&rsquo;s pick</span>
          </span>
        )}
      </div>

      {/* The photo takes whatever height the text below doesn't need, so the
          card fills the screen exactly on any phone rather than being sized
          to a fixed aspect ratio that leaves a gap on tall ones and overflows
          on short ones. */}
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open article: ${story.title}`}
        className="relative mt-3 block min-h-0 w-full flex-1 overflow-hidden rounded-2xl bg-rule"
      >
        {showImage ? (
          <Image src={story.image_url!} alt="" fill sizes="100vw" className="object-cover" onError={() => setImgFailed(true)} unoptimized />
        ) : (
          <span className="absolute inset-0 flex items-end bg-[#EDEDF3] p-5" aria-hidden>
            <span className="font-serif text-3xl italic text-rule">{story.source_name}</span>
          </span>
        )}
      </button>

      <button onClick={onOpen} className="block w-full shrink-0 text-left">
        <h2 className="mt-4 font-serif text-[25px] font-semibold leading-[1.1] tracking-[-0.015em]">{story.title}</h2>
        <p className="mt-2.5 font-serif text-[16px] leading-relaxed text-ink/80 line-clamp-4">{story.ai_short_summary}</p>
        {/* For You's whole point over a black-box algorithm: say why, in the
            reader's own terms, not just rank it silently. */}
        {reason && <p className="mt-2 text-[12px] font-sans text-accent">{reason}</p>}
        <p className="mt-2 text-[12px] font-sans text-muted">
          {story.source_name} · {timeAgo(story.published_at)} · {readingTimeMinutes(story)} min read · Tap to read →
        </p>
      </button>

      <div className="mt-3.5 shrink-0 rule-t pt-3">
        <EngagementBar story={story} onComment={onComment} onShare={onShare} />
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</h3>
      <div className="mt-2 font-serif text-[17px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

function ForYouArticle({
  story, related, onClose, onShare,
}: {
  story: Story;
  related: Story[];
  onClose: () => void;
  onShare: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const [showCommentSheet, setShowCommentSheet] = useState(false);
  const date = new Date(story.published_at);
  const showImage = story.image_url && !imgFailed;

  return (
    // Sized by its own content — the slot around it (see SwipeFeed) reserves
    // exactly one screen regardless of how long the article turns out to be.
    <article className="w-full bg-paper text-ink">
      {/* Hero image, tap to go back to the card — the same gesture that
          opened it, mirroring Watch. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close article"
        className="relative block aspect-[16/9] w-full overflow-hidden bg-rule"
      >
        {showImage ? (
          <Image src={story.image_url!} alt="" fill sizes="448px" className="object-cover" onError={() => setImgFailed(true)} unoptimized />
        ) : (
          <span className="absolute inset-0 bg-[#EDEDF3]" aria-hidden />
        )}
        <span className="absolute left-4 top-4 rounded-full bg-paper/90 px-3 py-1 text-[12px] font-sans font-medium backdrop-blur-sm">← Back</span>
      </button>

      <div className="px-5 pb-20 pt-5">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{categoryLabel(story.category)}</span>
        <h1 className="mt-2 font-serif text-[27px] font-bold leading-[1.12] tracking-[-0.015em]">{story.title}</h1>
        <p className="mt-3 text-[12px] font-sans text-muted">
          {story.source_name} · {date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({timeAgo(story.published_at)} ago)
        </p>

        <div className="mt-4">
          <EngagementBar story={story} onComment={() => setShowCommentSheet(true)} onShare={onShare} />
        </div>

        <p className="mt-5 font-serif text-[19px] leading-relaxed">{story.ai_medium_summary}</p>

        <Section label="Why this matters">{story.ai_why_it_matters}</Section>
        <Section label="What to know">
          <ul className="space-y-2">
            {story.ai_key_points.map((p, i) => (
              <li key={i} className="flex gap-3"><span className="mt-[10px] h-[5px] w-[5px] shrink-0 rounded-full bg-ink/60" aria-hidden /><span>{p}</span></li>
            ))}
          </ul>
        </Section>
        <Section label="Background">{story.ai_background}</Section>
        <Section label="What may happen next">{story.ai_what_next}</Section>

        <Comments story={story} />
        {showCommentSheet && <CommentSheet story={story} onClose={() => setShowCommentSheet(false)} />}

        <a href={story.original_url} target="_blank" rel="noopener noreferrer"
          className="mt-7 flex items-center justify-between rounded-md border border-ink/15 bg-white px-4 py-3.5 font-sans text-[14px] font-medium active:bg-accentSoft">
          <span>Read the original at <span className="font-semibold">{story.source_name}</span></span>
          <span aria-hidden>→</span>
        </a>
        <p className="mt-2 text-[11px] font-sans text-muted">AI-assisted summary. {story.source_name} is the source of record.</p>

        {related.length > 0 && (
          <div className="mt-7 rule-t pt-5">
            <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Related</h3>
            <div className="mt-3 space-y-3">
              {related.map((r) => (
                <p key={r.id}>
                  <span className="block font-serif text-[17px] font-semibold leading-snug">{r.title}</span>
                  <span className="mt-0.5 block text-[11px] font-sans text-muted">{r.source_name} · {timeAgo(r.published_at)}</span>
                </p>
              ))}
            </div>
          </div>
        )}

        <p className="mt-7 rule-t pt-4 text-center font-serif text-[14px] italic text-muted">Keep swiping for the next story ↑</p>
      </div>
    </article>
  );
}

export default function ForYouFeed({
  stories, greeting, following, reasonFor, relatedFor, showDemoTag, onShare, onNeedMore,
}: {
  stories: Story[];
  greeting: Greeting | null;
  /** Interests and outlets, already labelled — shown on the greeting page. */
  following: string[];
  reasonFor: (s: Story) => string | null;
  relatedFor: (s: Story) => Story[];
  showDemoTag: boolean;
  onShare: (s: Story) => void;
  onNeedMore: () => void;
}) {
  const [commentStory, setCommentStory] = useState<Story | null>(null);

  // The editor's pick is the top-ranked story with an honest reason to give,
  // which is index 0 by construction — no reason means no manufactured pick.
  const pickId = stories.length > 0 && reasonFor(stories[0]) ? stories[0].id : null;

  return (
    <>
      <SwipeFeed
        stories={stories}
        onNeedMore={onNeedMore}
        slotClassName="bg-paper"
        leading={greeting ? <GreetingPage greeting={greeting} following={following} /> : undefined}
        renderCard={(s, { open }) => (
          <ForYouCard
            story={s}
            isPick={s.id === pickId}
            reason={reasonFor(s)}
            showDemoTag={showDemoTag}
            onOpen={open}
            onComment={() => setCommentStory(s)}
            onShare={() => onShare(s)}
          />
        )}
        renderArticle={(s, { close }) => (
          <ForYouArticle story={s} related={relatedFor(s)} onClose={close} onShare={() => onShare(s)} />
        )}
      />

      {commentStory && <CommentSheet story={commentStory} onClose={() => setCommentStory(null)} />}
    </>
  );
}
