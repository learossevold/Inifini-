'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

interface Stats {
  mode: string;
  storyCount: number;
  sourceCount: number;
  lastIngestion: string | null;
  aiEngine: string;
  waitlistCount: number;
  sources: { name: string; domain: string; active: boolean; last_status: string | null; last_fetched_at: string | null }[];
  recentStories: { title: string; source_name: string; published_at: string; is_demo: boolean }[];
}

/** How old a story is, so "are we importing today's news?" is answerable at a glance. */
function ageDays(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}
function ageLabel(iso: string): string {
  const days = ageDays(iso);
  if (days < 1 / 24) return 'just now';
  if (days < 1) return `${Math.round(days * 24)}h old`;
  return `${Math.round(days)} days old`;
}

export default function AdminPage() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<string | null>(null);
  const [narrating, setNarrating] = useState(false);
  const [narrateResult, setNarrateResult] = useState<string | null>(null);
  const [resumming, setResumming] = useState(false);
  const [resummarizeResult, setResummarizeResult] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  // Nothing here used to report a slow or failed request: no loading state, no
  // timeout, and a throw from fetch went unhandled, so the page just sat there.
  // Now every outcome ends in either stats or a message on screen.
  const loadStats = useCallback(async (pw: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin-stats', {
        headers: { 'x-admin-password': pw },
        signal: AbortSignal.timeout(20_000),
      });
      if (res.status === 401) {
        setAuthed(false);
        setError('Wrong password (or ADMIN_PASSWORD not set in production).');
        return;
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        setError(`Could not load stats (HTTP ${res.status}). ${detail.slice(0, 200)}`);
        return;
      }
      setStats(await res.json());
      setAuthed(true);
      sessionStorage.setItem('admin-pw', pw);
    } catch (e: any) {
      setError(
        e?.name === 'TimeoutError' || e?.name === 'AbortError'
          ? 'Stats took longer than 20s and were given up on. The database is most likely slow or unreachable.'
          : `Could not reach the server: ${e?.message ?? 'unknown error'}`
      );
    } finally {
      setLoading(false);
    }
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

  // Existing stories keep whatever summary they were ingested with. This
  // rewrites the short ones — the way to backfill after adding an AI key.
  const triggerResummarize = async () => {
    setResumming(true);
    setResummarizeResult(null);
    try {
      const res = await fetch('/api/ingest/resummarize', { method: 'POST', headers: { 'x-admin-password': password } });
      const data = await res.json();
      setResummarizeResult(
        res.ok
          ? data.message ?? `Rewrote ${data.updated} of ${data.total}${data.failed ? `, ${data.failed} failed` : ''}. ${data.remaining > 0 ? `${data.remaining} still short, run again.` : 'All done.'}`
          : `Failed: ${data.error}`
      );
      await loadStats(password);
    } catch {
      setResummarizeResult('Re-summarize request failed.');
    } finally {
      setResumming(false);
    }
  };

  const triggerNarration = async () => {
    setNarrating(true);
    setNarrateResult(null);
    try {
      const res = await fetch('/api/ingest/narrate', { method: 'POST', headers: { 'x-admin-password': password } });
      const data = await res.json();
      setNarrateResult(
        res.ok
          ? data.message ?? `Narrated ${data.narrated}/${data.total}, ${data.failed} failed.`
          : `Failed: ${data.error}`
      );
    } catch {
      setNarrateResult('Narration request failed.');
    } finally {
      setNarrating(false);
    }
  };

  const triggerPush = async () => {
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetch('/api/push/send', { method: 'POST', headers: { 'x-admin-password': password } });
      const data = await res.json();
      setPushResult(
        res.ok
          ? data.message ?? `Sent to ${data.sent}/${data.total} devices${data.removed ? `, ${data.removed} stale removed` : ''}. Story: ${data.story}`
          : `Failed: ${data.error}`
      );
    } catch {
      setPushResult('Send request failed.');
    } finally {
      setPushing(false);
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
        <button onClick={() => loadStats(password)} disabled={loading} className="mt-3 w-full rounded-md bg-ink py-2.5 font-medium text-paper disabled:opacity-60">
          {loading ? 'Loading…' : 'Open admin'}
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

      {error && <p className="mt-4 rounded-md border border-accent px-3 py-2 text-accent">{error}</p>}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {[
              ['Stories', String(stats.storyCount)],
              ['Sources', String(stats.sourceCount)],
              ['Last ingestion', stats.lastIngestion ? new Date(stats.lastIngestion).toLocaleString() : 'never'],
              ['AI engine', stats.aiEngine],
              ['Data mode', stats.mode],
              ['Waitlist signups', String(stats.waitlistCount)],
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

          <button
            onClick={triggerResummarize}
            disabled={resumming}
            className="mt-3 w-full rounded-md border border-ink bg-white py-3 font-medium text-ink disabled:opacity-60"
          >
            {resumming ? 'Rewriting… (generating longer summaries)' : 'Rewrite short summaries'}
          </button>
          {resummarizeResult && <p className="mt-3 rounded-md bg-accentSoft px-3 py-2">{resummarizeResult}</p>}

          <button
            onClick={triggerNarration}
            disabled={narrating}
            className="mt-3 w-full rounded-md border border-ink bg-white py-3 font-medium text-ink disabled:opacity-60"
          >
            {narrating ? 'Narrating… (generating Watch audio)' : 'Generate Watch narration'}
          </button>
          {narrateResult && <p className="mt-3 rounded-md bg-accentSoft px-3 py-2">{narrateResult}</p>}

          <button
            onClick={triggerPush}
            disabled={pushing}
            className="mt-3 w-full rounded-md border border-ink bg-white py-3 font-medium text-ink disabled:opacity-60"
          >
            {pushing ? 'Sending…' : 'Send morning brief now'}
          </button>
          {pushResult && <p className="mt-3 rounded-md bg-accentSoft px-3 py-2">{pushResult}</p>}

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
                  {s.source_name} · {new Date(s.published_at).toLocaleString()} · <span className={ageDays(s.published_at) > 3 ? 'font-semibold text-accent' : ''}>{ageLabel(s.published_at)}</span> {s.is_demo && '· DEMO'}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
