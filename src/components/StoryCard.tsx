'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Story } from '@/lib/types';
import { readingTimeMinutes } from '@/lib/ranking';
import { ImportanceMarker, categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';

export default function StoryCard({
  story, lead = false, showDemoTag = false, onOpen, onComment, onShare,
}: {
  story: Story;
  lead?: boolean;
  showDemoTag?: boolean;
  onOpen: (s: Story) => void;
  onComment: (s: Story) => void;
  onShare: (s: Story) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = story.image_url && !imgFailed;

  return (
    <article className="animate-fadeUp">
      <button onClick={() => onOpen(story)} className="block w-full text-left group">
        {showImage ? (
          <div className={`relative w-full overflow-hidden rounded-lg bg-rule ${lead ? 'aspect-[4/3]' : 'aspect-[16/10]'}`}>
            <Image src={story.image_url!} alt="" fill sizes="448px" className="object-cover" onError={() => setImgFailed(true)} unoptimized />
          </div>
        ) : (
          <div className={`flex w-full items-end rounded-lg bg-[#F0EDE5] p-4 ${lead ? 'aspect-[4/3]' : 'aspect-[16/10]'}`} aria-hidden>
            <span className="font-serif italic text-2xl text-rule">{story.source_name}</span>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2.5 text-[11px] font-sans uppercase tracking-[0.14em] text-muted">
          <span className="font-semibold text-ink">{categoryLabel(story.category)}</span>
          <ImportanceMarker story={story} />
          {showDemoTag && story.is_demo && <span className="rounded-sm bg-accentSoft px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-accent">DEMO</span>}
        </div>

        <h2 className={`mt-1.5 font-serif font-semibold leading-[1.12] tracking-[-0.01em] group-active:text-accent ${lead ? 'text-[27px]' : 'text-[22px]'}`}>
          {story.title}
        </h2>
        <p className="mt-2 font-serif text-[16px] leading-relaxed text-ink/80">{story.ai_short_summary}</p>
        <p className="mt-2.5 text-[12px] font-sans text-muted">
          {story.source_name} · {timeAgo(story.published_at)} · {readingTimeMinutes(story)} min read
        </p>
      </button>

      <div className="mt-3">
        <EngagementBar story={story} onComment={() => onComment(story)} onShare={() => onShare(story)} />
      </div>
    </article>
  );
}
