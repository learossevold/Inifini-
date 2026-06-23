'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Stats {
  mode: string;
  storyCount: number;
  sourceCount: number;
  lastIngestion: string | null;
  aiEngine: string;
  sources: { name: string; domain: string; active: boolean; last_status: string | null; last_fetched_at: string | null }[];
  recentStories: { title: string; source_name: string; published_at: string; is_demo: boolean }[];
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);

  const loadStats = useCallback(async (pw: string) => {
    setError(null);
    const res = await fetch('/api/admin-stats', { headers: { 'x-admin-password': pw } });
    if (res.status === 401) {
      setAuthed(false);
      setError('Wrong password (or ADMIN_PASSWORD not set in production).');
      return;
    }
    if (!res.ok) {
      setError('Could not load stats.');
      return;
    }
    setStats(await res.json());
    setAuthed(true);
    sessionStorage.setItem('admin-pw', pw);
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem('admin-pw');
    if (saved !== null) {
      setPassword(saved);
      loadStats(saved);
    } else if (process.env.NODE_ENV === 'development') {
      loadStats(''); // dev mode: open if ADMIN_PASSWORD unset
    }
  }, [loadStats]);

  const triggerIngestion = async () => {
    setIngesting(true);
    setIngestResult(null);
    try {
      const res = await fetch('/api/ingest', { method: 'POST', headers: { 'x-admin-password': password } });
      const data = await res.json();
      setIngestResult(
        res.ok
          ? `Fetched ${data.fetched}, inserted ${data.inserted}, ${data.duplicates} duplicates skipped, ${data.errors.length} errors. Engine: ${data.engine}. Mode: ${data.mode}.`
          : `Failed: ${data.error}`
      );
      await loadStats(password);
    } catch {
      setIngestResult('Ingestion request failed.');
    } finally {
      setIngesting(false);
    }
  };

  if (!authed) {
    return (
      <main className="mx-auto max-w-sm px-5 py-16 font-sans">
        <h1 className="font-serif text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-muted">Enter the admin password (ADMIN_PASSWORD environment variable).</p>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadStats(password)}
          className="mt-4 w-full rounded-md border border-rule bg-white px-3 py-2.5"
          placeholder="Password"
        />
        <button onClick={() => loadStats(password)} className="mt-3 w-full rounded-md bg-ink py-2.5 font-medium text-paper">
          Open admin
        </button>
        {error && <p className="mt-3 text-sm text-accent">{error}</p>}
        <Link href="/" className="mt-6 block text-sm text-muted underline">← Back to the paper</Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 font-sans text-[14px]">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl font-bold">Admin</h1>
        <Link href="/" className="text-muted underline">← Inifini</Link>
      </div>

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['Stories', String(stats.storyCount)],
              ['Sources', String(stats.sourceCount)],
              ['Last ingestion', stats.lastIngestion ? new Date(stats.lastIngestion).toLocaleString() : 'never'],
              ['AI engine', stats.aiEngine],
              ['Data mode', stats.mode],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-rule bg-white/60 px-4 py-3">
                <p className="text-[11px] uppercase tracking-wider text-muted">{k}</p>
                <p className="mt-1 font-serif text-lg font-semibold break-words">{v}</p>
              </div>
            ))}
          </div>

          <button
            onClick={triggerIngestion}
            disabled={ingesting}
            className="mt-5 w-full rounded-md bg-ink py-3 font-medium text-paper disabled:opacity-60"
          >
            {ingesting ? 'Ingesting… (fetching feeds + generating summaries)' : 'Run ingestion now'}
          </button>
          {ingestResult && <p className="mt-3 rounded-md bg-accentSoft px-3 py-2">{ingestResult}</p>}

          <h2 className="mt-8 font-serif text-lg font-bold">Source status</h2>
          <div className="mt-3 space-y-2">
            {stats.sources.map((s) => (
              <div key={s.domain + s.name} className="flex items-center justify-between rounded-md border border-rule bg-white/60 px-4 py-2.5">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-[12px] text-muted">{s.domain} · {s.last_status ?? 'no runs yet'}</p>
                </div>
                <span className={`h-2.5 w-2.5 rounded-full ${s.last_status?.startsWith('error') ? 'bg-accent' : s.active ? 'bg-emerald-500' : 'bg-rule'}`} />
              </div>
            ))}
          </div>

          <h2 className="mt-8 font-serif text-lg font-bold">Recently imported</h2>
          <div className="mt-3 space-y-2">
            {stats.recentStories.map((s, i) => (
              <div key={i} className="rounded-md border border-rule bg-white/60 px-4 py-2.5">
                <p className="font-medium leading-snug">{s.title}</p>
                <p className="text-[12px] text-muted">
                  {s.source_name} · {new Date(s.published_at).toLocaleString()} {s.is_demo && '· DEMO'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
