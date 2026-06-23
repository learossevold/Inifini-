'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CATEGORIES, Category } from '@/lib/types';
import { MOCK_STORIES } from '@/lib/mock-data';
import { categoryLabel, timeAgo } from '@/components/ui';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    return MOCK_STORIES.filter((s) => {
      const matchesText = !query || s.title.toLowerCase().includes(query) || s.ai_short_summary.toLowerCase().includes(query);
      const matchesCat = cat === 'all' || s.category === cat;
      return matchesText && matchesCat;
    });
  }, [q, cat]);

  return (
    <main className="px-5 py-6">
      <h1 className="font-serif text-2xl font-bold">Search</h1>
      <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories…"
        className="mt-4 w-full rounded-lg border border-rule bg-white px-4 py-3 outline-none" />

      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
        <button onClick={() => setCat('all')} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] ${cat === 'all' ? 'border-accent bg-accentSoft text-accent' : 'border-rule'}`}>All</button>
        {CATEGORIES.filter((c) => c.id !== 'top').map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] ${cat === c.id ? 'border-accent bg-accentSoft text-accent' : 'border-rule'}`}>{c.label}</button>
        ))}
      </div>

      <ul className="mt-5 space-y-4">
        {results.length === 0 && <p className="text-[14px] text-muted">No matches. Try another word or category.</p>}
        {results.map((s) => (
          <li key={s.id}>
            <Link href="/" className="block">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{categoryLabel(s.category)}</p>
              <p className="mt-0.5 font-serif text-[17px] font-semibold leading-snug">{s.title}</p>
              <p className="mt-0.5 text-[12px] text-muted">{s.source_name} · {timeAgo(s.published_at)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
