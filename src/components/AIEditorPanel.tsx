'use client';

import { useCallback, useEffect, useState } from 'react';
import { EditorProfile } from '@/lib/affinity';
import { ReadingSummary } from '@/lib/types';
import { useSession } from '@/lib/session';

/**
 * "Your AI Editor" — what Inifini has actually learned about this reader,
 * shown to them plainly.
 *
 * The point is that the ranking is not a black box: the same signal that
 * orders the Explore feed is the one displayed here, so what it says and
 * what the feed does cannot drift apart. It reports only what is genuinely
 * measured — which subjects and outlets this reader's own actions point at,
 * and how much evidence that rests on. Reading depth, time of day and
 * "prefers long analysis" style traits are deliberately absent: nothing
 * records them yet, and inventing them would make the panel a nicer story
 * than the truth.
 */
export default function AIEditorPanel() {
  const { loadEditorProfile, resetEditorLearning, loadReadingSummary } = useSession();
  const [profile, setProfile] = useState<EditorProfile | null>(null);
  const [reading, setReading] = useState<ReadingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([loadEditorProfile(), loadReadingSummary()]);
    setProfile(p);
    setReading(r);
    setLoading(false);
  }, [loadEditorProfile, loadReadingSummary]);

  useEffect(() => { load(); }, [load]);

  const doReset = async () => {
    setResetting(true);
    await resetEditorLearning();
    setConfirmingReset(false);
    setResetting(false);
    await load();
  };

  // Below this there is too little to describe anyone honestly — a couple of
  // taps would otherwise render as a confident "you mostly read Sport".
  const ENOUGH = 3;
  const known = profile && profile.totalSignals >= ENOUGH && profile.categories.length > 0;

  return (
    <section className="mx-5 mt-6 overflow-hidden rounded-xl border border-rule bg-white/70">
      <div className="border-b border-rule bg-accentSoft/50 px-4 py-3.5">
        <h2 className="font-serif text-[17px] font-bold leading-tight">Your AI Editor</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">Your personal news profile</p>
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <p className="py-4 text-center text-[13.5px] text-muted">Reading your profile…</p>
        ) : !known ? (
          <>
            <p className="font-serif text-[15.5px] leading-snug">Still getting to know you.</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
              As you read, save and share stories, your editor learns which subjects and outlets
              you actually care about, and shapes your Explore feed around them. Nothing you
              read is shared with anyone.
            </p>
          </>
        ) : (
          <>
            <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">You mostly read</p>
            <ul className="mt-2.5 space-y-2">
              {profile!.categories.map((c) => (
                <li key={c.id} className="flex items-center gap-3">
                  <span className="w-[92px] shrink-0 truncate text-[13.5px] font-medium">{c.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-accentSoft" aria-hidden>
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${c.score}%` }} />
                  </span>
                  <span className="w-7 shrink-0 text-right text-[12px] tabular-nums text-muted">{c.score}</span>
                </li>
              ))}
            </ul>

            {profile!.sources.length > 0 && (
              <>
                <p className="mt-5 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">You trust</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {profile!.sources.map((s) => (
                    <span key={s.domain} className="rounded-full bg-accentSoft px-3 py-1 text-[12.5px] font-medium text-accent">
                      {s.name}
                    </span>
                  ))}
                </div>
              </>
            )}

            {reading && reading.storiesRead > 0 && (
              <p className="mt-5 rule-t pt-4 font-serif text-[15px] leading-snug">
                This month: <span className="font-bold">{reading.storiesRead}</span>{' '}
                {reading.storiesRead === 1 ? 'story' : 'stories'}, about{' '}
                <span className="font-bold">{reading.minutes}</span> minutes of reading.
              </p>
            )}

            <p className="mt-3 text-[12px] leading-relaxed text-muted">
              Learned from {profile!.totalSignals} {profile!.totalSignals === 1 ? 'action' : 'actions'}
              {profile!.deliberateSignals > 0 && <> — {profile!.deliberateSignals} of them deliberate (saved, liked, shared or commented, which count for more than simply opening something)</>}.
            </p>
          </>
        )}

        {/* Adjusting preferences is the Topics and outlets control panel
            further down this page, so this only offers the reset. */}
        {!confirmingReset ? (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-4 text-[13px] font-medium text-accent underline underline-offset-2"
          >
            Reset what my editor has learned
          </button>
        ) : (
          <div className="mt-4 rounded-lg border border-rule bg-paper px-3.5 py-3">
            <p className="text-[13px] leading-relaxed">
              This clears your reading history, so your editor starts over.{' '}
              <span className="font-semibold">Your saved and liked stories stay</span> — they are yours,
              and they will still tell the editor a little about what you like.
            </p>
            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setConfirmingReset(false)} className="px-3 py-1.5 text-[13px] text-muted">Cancel</button>
              <button
                onClick={doReset}
                disabled={resetting}
                className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-paper disabled:opacity-60"
              >
                {resetting ? 'Resetting…' : 'Reset'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
