'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Story } from '@/lib/types';
import { categoryLabel } from './ui';
import EngagementBar from './EngagementBar';

/**
 * Watch tab. Each story becomes a full-screen vertical "narrated summary":
 *  - hero image with a slow Ken Burns zoom (or category-tinted background)
 *  - the short summary as large, sequential on-screen captions
 *  - optional AI narration audio (only if a real video_url / audio is present)
 *
 * This is explicitly a NARRATED SUMMARY, never fake footage — the attribution
 * label makes that clear. With no TTS/video service configured, it gracefully
 * runs as a silent caption card that still feels alive.
 */

function WatchCard({ story, active }: { story: Story; active: boolean }) {
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
    <div className="snap-screen relative h-[calc(100vh-7.5rem)] w-full overflow-hidden bg-night text-white">
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
        <a href={story.original_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[12px] text-white/70 underline underline-offset-2">
          AI narration of {story.source_name}’s reporting — read the original
        </a>
      </div>
    </div>
  );
}

export default function WatchFeed({
  stories, onComment, onShare, onNeedMore,
}: {
  stories: Story[];
  onComment: (s: Story) => void;
  onShare: (s: Story) => void;
  onNeedMore: () => void;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    <div ref={containerRef} className="snap-y-screen h-[calc(100vh-7.5rem)] overflow-y-auto no-scrollbar">
      {stories.map((s, i) => (
        <div key={s.id} data-watch-card data-idx={i} className="relative">
          <WatchCard story={s} active={i === activeIdx} />
          {/* Right-side vertical engagement rail */}
          <div className="absolute bottom-32 right-3 z-10">
            <EngagementBar story={s} vertical dark onComment={() => onComment(s)} onShare={() => onShare(s)} />
          </div>
        </div>
      ))}
    </div>
  );
}
