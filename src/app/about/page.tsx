import Link from 'next/link';
import { RSS_SOURCES } from '@/config/sources';

export const metadata = { title: 'About — Inifini' };

export default function AboutPage() {
  return (
    <main className="px-5 py-8 font-serif text-[17px] leading-relaxed">
      <Link href="/" className="font-sans text-[13px] text-muted underline underline-offset-2">← Back to the paper</Link>
      <h1 className="mt-5 text-3xl font-bold tracking-tight">About Inifini</h1>

      <p className="mt-5">Inifini is an <strong>AI-assisted news discovery prototype</strong> — the calm reading quality of a newspaper with the endless rhythm of a feed, plus a lightweight social layer for friends.</p>

      <h2 className="mt-8 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">Editorial note</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5">
        <li>Stories are summarized from publicly available RSS feeds — titles, short excerpts and publication data only.</li>
        <li>Original publishers are always credited and linked. Inifini does not replace original journalism.</li>
        <li>Read the original sources for full, verified reporting.</li>
        <li>AI summaries may contain errors. When source data is limited, summaries say so.</li>
        <li>No full articles are copied or scraped. No quotes are invented.</li>
        <li>Video summaries are AI <em>narrations</em> of reporting — never fabricated footage of events.</li>
        <li>User comments are the views of individual users, not Inifini or the original publishers.</li>
      </ul>

      <h2 className="mt-8 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-muted">Current sources</h2>
      <ul className="mt-3 space-y-1.5 font-sans text-[14px]">
        {RSS_SOURCES.map((s) => (
          <li key={s.rss_url} className="flex justify-between border-b border-rule pb-1.5"><span className="font-medium">{s.name}</span><span className="text-muted">{s.domain}</span></li>
        ))}
      </ul>

      <p className="mt-10 font-sans text-[12px] text-muted">Prototype — not a commercial news service. Publishers may request feed removal at any time.</p>
    </main>
  );
}
