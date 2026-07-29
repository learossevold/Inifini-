'use client';

import { useEffect, useState } from 'react';
import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';

/**
 * Opens after a story is saved. The story is already in Saved by then; this is
 * only for optionally filing it into a folder, so dismissing keeps the save.
 */
export default function CollectionSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { collections, createCollection, collectionsForStory, setInCollection } = useSession();
  const [member, setMember] = useState<Set<string> | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    collectionsForStory(story.id).then((s) => { if (!cancelled) setMember(s); });
    return () => { cancelled = true; };
  }, [story.id, collectionsForStory]);

  const toggle = async (id: string) => {
    if (!member) return;
    const next = new Set(member);
    const isIn = next.has(id);
    isIn ? next.delete(id) : next.add(id);
    setMember(next);
    await setInCollection(id, story.id, !isIn);
  };

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setErr('Give the collection a name.'); return; }
    setBusy(true); setErr(null);
    const { id, error } = await createCollection(trimmed);
    if (error) { setErr(error); setBusy(false); return; }
    if (id) {
      await setInCollection(id, story.id, true);
      setMember((prev) => new Set(prev ?? []).add(id));
    }
    setName(''); setCreating(false); setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[62] flex items-end" role="dialog" aria-modal="true" aria-label="Add to a collection">
      <button className="absolute inset-0 bg-ink/50" onClick={onClose} aria-label="Close" />
      <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-paper px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />

        <h2 className="font-serif text-[20px] font-bold">Saved</h2>
        <p className="mt-1 text-[13.5px] text-muted line-clamp-1">{story.title}</p>
        <p className="mt-2 text-[13px] text-muted">Add it to a collection, or just close this. It stays in Saved either way.</p>

        {member === null ? (
          <p className="py-8 text-center text-[14px] text-muted">Loading…</p>
        ) : (
          <ul className="mt-4 space-y-1">
            {collections.map((c) => {
              const on = member.has(c.id);
              return (
                <li key={c.id}>
                  <button
                    onClick={() => toggle(c.id)}
                    aria-pressed={on}
                    className="flex w-full items-center justify-between rounded-lg px-2 py-3 text-left active:bg-accentSoft/50"
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${on ? 'bg-accent text-paper' : 'bg-rule/60 text-ink'}`}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                      </span>
                      <span>
                        <span className="block text-[15px] font-medium">{c.name}</span>
                        <span className="block text-[12px] text-muted">{c.count} {c.count === 1 ? 'story' : 'stories'}</span>
                      </span>
                    </span>
                    {on && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                        <path d="m5 13 4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {creating ? (
          <div className="mt-3">
            <input
              autoFocus
              value={name}
              onChange={(e) => { setName(e.target.value); setErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
              placeholder="Collection name"
              maxLength={40}
              aria-label="Collection name"
              className="w-full rounded-lg border border-rule bg-white px-4 py-3 outline-none focus:border-accent"
            />
            {err && <p className="mt-2 text-[13px] text-accent">{err}</p>}
            <div className="mt-2 flex gap-2">
              <button onClick={() => { setCreating(false); setErr(null); }} className="flex-1 rounded-lg border border-rule py-2.5 text-[14px] font-medium">Cancel</button>
              <button onClick={create} disabled={busy} className="flex-1 rounded-lg bg-ink py-2.5 text-[14px] font-semibold text-paper disabled:opacity-50">
                {busy ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCreating(true)}
            className="mt-3 flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left active:bg-accentSoft/50"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-rule text-accent">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
            <span className="text-[15px] font-medium text-accent">New collection</span>
          </button>
        )}

        <button onClick={onClose} className="mt-5 w-full rounded-lg border border-rule py-3 font-medium">Done</button>
      </div>
    </div>
  );
}
