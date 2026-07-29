import type { Metadata } from 'next';
import ComingSoonForm from '@/components/ComingSoonForm';

export const metadata: Metadata = {
  title: 'Inifini — Coming soon',
  description: 'A new kind of news app. Be the first to know when Inifini launches.',
};

const TICKER = [
  'WORLD NEWS', 'TECHNOLOGY', 'YOUR FRIENDS, NOT STRANGERS', 'SPORT',
  'SCIENCE & AI', 'CULTURE', 'BUSINESS', 'READ TOGETHER',
];

const FEATURES = [
  { title: 'Watch the news', body: 'Swipe through today’s stories like your favourite feed.' },
  { title: 'Read together', body: 'See what your friends are reading, right now.' },
  { title: 'AI, credited', body: 'Summarised fast. Every story links back to its source.' },
];

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-paper">
      {/* Ticker: content is rendered twice back to back so the CSS animation
          (translateX to -50%) loops with no visible seam. aria-hidden on the
          duplicate keeps a screen reader from reading the strip twice. */}
      <div className="overflow-hidden border-b border-ink/10 bg-ink py-2.5">
        <div className="marquee-track flex w-max whitespace-nowrap">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0" aria-hidden={copy === 1}>
              {TICKER.map((word, i) => (
                <span key={i} className="flex items-center px-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-gold">
                  {word}
                  <span className="ml-4 text-gold/50">&middot;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <header className="flex items-center justify-between border-b border-rule px-5 py-4">
        <div className="flex items-center gap-2.5">
          <svg width="28" height="28" viewBox="0 0 100 100" fill="none" aria-hidden="true">
            <path d="M50 6 A44 44 0 1 0 50 94 L94 94 L94 50 A44 44 0 0 0 50 6 Z" fill="#13142B" />
            <path d="M50 32 A18 18 0 1 0 50 68 L68 68 L68 50 A18 18 0 0 0 50 32 Z" fill="#FCFCFD" />
          </svg>
          <span className="font-serif text-[21px] font-bold tracking-tight text-ink">inifini</span>
        </div>
        <span className="rounded-full bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-gold">Coming soon</span>
      </header>

      <main className="flex flex-1 flex-col items-center px-6 pb-16 pt-14 text-center">
        <span className="rounded-full bg-ink px-4 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-gold">
          A new kind of news
        </span>

        <h1 className="mt-6 font-serif text-[42px] font-bold leading-[1.06] text-ink">
          The world,<br />
          <span className="italic text-gold">right now.</span>
        </h1>

        <p className="mt-4 max-w-xs text-[16px] leading-snug text-ink/85">
          News, summarised by AI, read and discussed with people you actually know.
        </p>

        <p className="mt-3 max-w-xs text-[14px] leading-relaxed text-muted">
          No feed built to trap you, no shouting match in the comments &mdash; just today&rsquo;s
          stories, shared with your closest friends instead of the whole internet.
        </p>

        <div className="mt-9 grid w-full max-w-sm grid-cols-1 gap-3 text-left sm:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-rule bg-white/60 px-4 py-3.5">
              <span className="block h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
              <p className="mt-2 text-[13px] font-semibold text-ink">{f.title}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-muted">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 w-full max-w-sm">
          <ComingSoonForm />
        </div>
      </main>

      <footer className="border-t border-rule px-5 py-6 text-center text-[12px] text-muted">
        &copy; {new Date().getFullYear()} Inifini. All rights reserved.
      </footer>
    </div>
  );
}
