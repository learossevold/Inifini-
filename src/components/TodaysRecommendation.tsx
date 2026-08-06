'use client';

import { Story } from '@/lib/types';
import StoryCard from './StoryCard';

/**
 * The one story your editor picked out, not a second list of suggestions.
 * Wraps the ordinary StoryCard rather than reinventing the card layout, so
 * it stays visually consistent with everything else in Explore — the tinted
 * border and the reason line above it are what mark it as chosen, not a
 * different way of presenting a story.
 */
export default function TodaysRecommendation({
  story, reason, showDemoTag, onOpen, onComment, onShare,
}: {
  story: Story;
  reason: string;
  showDemoTag?: boolean;
  onOpen: (s: Story) => void;
  onComment: (s: Story) => void;
  onShare: (s: Story) => void;
}) {
  return (
    <section className="rounded-xl border border-accent/25 bg-accentSoft/40 p-4">
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent" aria-hidden>
          <path d="M12 3l2.1 5.3L20 9.6l-4 4.1.9 5.9L12 16.9 7.1 19.6l.9-5.9-4-4.1 5.9-1.3z" />
        </svg>
        <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Today&rsquo;s recommendation</p>
      </div>
      <p className="mt-2 font-serif text-[15px] italic leading-snug text-ink/75">{reason}</p>
      <div className="mt-3">
        <StoryCard story={story} showDemoTag={showDemoTag} onOpen={onOpen} onComment={onComment} onShare={onShare} />
      </div>
    </section>
  );
}
