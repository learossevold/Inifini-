'use client';

import { NewsMode } from '@/lib/types';
import { useSession } from '@/lib/session';

/**
 * Watch or News — the same stories, seen or read.
 *
 * They were two tabs for a while, which quietly implied two different feeds
 * when they have always been one set of stories in two registers. Whether you'd
 * rather watch the news or read it is a standing preference, not a decision to
 * remake every time the app opens, so it belongs here — leaving the app with
 * one news tab plus For You.
 */
const OPTIONS: { id: NewsMode; label: string; blurb: string }[] = [
  { id: 'watch', label: 'Watch', blurb: 'Full-screen, narrated, one story at a time.' },
  { id: 'news', label: 'News', blurb: 'A scrolling page of stories to read.' },
];

export default function NewsModeToggle() {
  const { newsMode, setNewsMode } = useSession();

  return (
    <section className="mt-8 rounded-xl border border-rule bg-white/60 px-4 py-4">
      <h2 className="text-[15px] font-semibold">Watch or read</h2>
      <p className="mt-1 text-[13px] leading-snug text-muted">
        Same stories either way. Pick how you&rsquo;d rather take them, and that tab sits next to For You.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Watch or read">
        {OPTIONS.map((o) => {
          const on = newsMode === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={on}
              onClick={() => setNewsMode(o.id)}
              className={`rounded-lg border px-3 py-3 text-left transition-colors ${on ? 'border-accent bg-accentSoft' : 'border-rule bg-white'}`}
            >
              <span className={`block text-[14px] font-semibold ${on ? 'text-accent' : 'text-ink'}`}>{o.label}</span>
              <span className="mt-0.5 block text-[12px] leading-snug text-muted">{o.blurb}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
