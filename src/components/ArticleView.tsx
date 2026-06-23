'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Story } from '@/lib/types';
import { categoryLabel, timeAgo } from './ui';
import EngagementBar from './EngagementBar';
import Comments from './Comments';

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">{label}</h3>
      <div className="mt-2 font-serif text-[17px] leading-relaxed text-ink/90">{children}</div>
    </section>
  );
}

export default function ArticleView({
  story, related, onClose, onOpen, onShare,
}: {
  story: Story;
  related: Story[];
  onClose: () => void;
  onOpen: (s: Story) => void;
  onShare: (s: Story) => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const date = new Date(story.published_at);

  return (
    <div className="animate-fadeUp rounded-xl border border-rule bg-white/70 px-5 py-6 shadow-[0_1px_3px_rgba(22,20,15,0.05)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">{categoryLabel(story.category)}</span>
        <button onClick={onClose} className="rounded-full border border-rule px-3 py-1 text-[12px] font-sans text-muted active:bg-accentSoft" aria-label="Close article">← Back to feed</button>
      </div>

      <h1 className="mt-3 font-serif text-[29px] font-bold leading-[1.1] tracking-[-0.015em]">{story.title}</h1>
      <p className="mt-3 text-[12px] font-sans text-muted">
        {story.source_name} · {date.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} ({timeAgo(story.published_at)} ago)
      </p>

      {story.image_url && !imgFailed && (
        <div className="relative mt-4 aspect-[16/9] w-full overflow-hidden rounded-md bg-rule">
          <Image src={story.image_url} alt="" fill sizes="448px" className="object-cover" onError={() => setImgFailed(true)} unoptimized />
        </div>
      )}

      <div className="mt-4">
        <EngagementBar story={story} onComment={() => { /* already in view */ }} onShare={() => onShare(story)} />
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

      <a href={story.original_url} target="_blank" rel="noopener noreferrer"
        className="mt-7 flex items-center justify-between rounded-md border border-ink/15 bg-paper px-4 py-3.5 font-sans text-[14px] font-medium active:bg-accentSoft">
        <span>Read the original at <span className="font-semibold">{story.source_name}</span></span>
        <span aria-hidden>→</span>
      </a>
      <p className="mt-2 text-[11px] font-sans text-muted">AI-assisted summary based on the public feed excerpt. May contain errors — the original reporting is the source of record.</p>

      <Comments story={story} />

      {related.length > 0 && (
        <div className="mt-7 rule-t pt-5">
          <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Related</h3>
          <div className="mt-3 space-y-3">
            {related.map((r) => (
              <button key={r.id} onClick={() => onOpen(r)} className="block w-full text-left group">
                <p className="font-serif text-[17px] font-semibold leading-snug group-active:text-accent">{r.title}</p>
                <p className="mt-0.5 text-[11px] font-sans text-muted">{r.source_name} · {timeAgo(r.published_at)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-7 rule-t pt-4 text-center font-serif italic text-[15px] text-muted">The paper continues below ↓</p>
    </div>
  );
}
