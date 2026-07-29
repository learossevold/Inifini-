'use client';

import { useEffect, useState } from 'react';
import { Profile } from '@/lib/types';
import { useSession } from '@/lib/session';
import { Avatar } from './ui';

/**
 * Blocked-people list and permanent account deletion.
 *
 * Both are App Store requirements for an app with user-generated content and
 * sign-in, and deletion is a GDPR right regardless.
 */
export default function AccountSettings() {
  const { configured, canAct, unblockUser, listBlocked, deleteAccount } = useSession();
  const [blockedList, setBlockedList] = useState<Profile[] | null>(null);
  const [showBlocked, setShowBlocked] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = () => { listBlocked().then(setBlockedList); };

  useEffect(() => { if (showBlocked && blockedList === null) load(); });

  if (!configured || !canAct) return null;

  const remove = async (id: string) => {
    await unblockUser(id);
    setBlockedList((prev) => (prev ?? []).filter((p) => p.id !== id));
  };

  const confirmDelete = async () => {
    setDeleting(true); setErr(null);
    const { error } = await deleteAccount();
    setDeleting(false);
    if (error) { setErr(error); return; }
    // Signed out by deleteAccount — land somewhere neutral.
    window.location.href = '/';
  };

  return (
    <>
      <section className="mt-8 rule-t pt-5">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Safety</h2>

        <button
          onClick={() => setShowBlocked((v) => !v)}
          aria-expanded={showBlocked}
          className="mt-2 flex w-full items-center justify-between py-2.5 text-left text-[14px]"
        >
          <span>Blocked people{blockedList ? ` · ${blockedList.length}` : ''}</span>
          <span className="text-muted" aria-hidden>{showBlocked ? '▲' : '▼'}</span>
        </button>

        {showBlocked && (
          blockedList === null ? (
            <p className="pb-2 text-[13px] text-muted">Loading…</p>
          ) : blockedList.length === 0 ? (
            <p className="pb-2 text-[13px] text-muted">You haven&rsquo;t blocked anyone.</p>
          ) : (
            <ul className="space-y-2 pb-2">
              {blockedList.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Avatar name={p.display_name || p.username} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{p.display_name || p.username}</span>
                      <span className="block truncate text-[12px] text-muted">@{p.username}</span>
                    </span>
                  </span>
                  <button onClick={() => remove(p.id)} className="shrink-0 rounded-full border border-rule px-3.5 py-1.5 text-[12.5px] font-medium">
                    Unblock
                  </button>
                </li>
              ))}
            </ul>
          )
        )}

        <button
          onClick={() => { setConfirming(true); setTyped(''); setErr(null); }}
          className="mt-1 block w-full py-2.5 text-left text-[14px] font-medium text-accent"
        >
          Delete my account
        </button>
      </section>

      {confirming && (
        <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true" aria-label="Delete your account">
          <button className="absolute inset-0 bg-ink/50" onClick={() => setConfirming(false)} aria-label="Cancel" />
          <div className="relative w-full rounded-t-2xl bg-paper px-5 pb-9 pt-3 animate-fadeUp">
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-rule" />
            <h2 className="font-serif text-[22px] font-bold">Delete your account?</h2>
            <p className="mt-2 text-[14px] leading-snug text-muted">
              This permanently removes your profile, saved stories, comments, friends and messages. It cannot be undone.
            </p>

            <label htmlFor="delete-confirm" className="mt-4 block text-[13px] font-medium">
              Type <span className="font-bold">DELETE</span> to confirm
            </label>
            <input
              id="delete-confirm"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setErr(null); }}
              autoComplete="off"
              className="mt-1.5 w-full rounded-lg border border-rule bg-white px-4 py-3 outline-none focus:border-accent"
            />
            {err && <p className="mt-2 text-[13px] text-accent">{err}</p>}

            <button
              onClick={confirmDelete}
              disabled={typed !== 'DELETE' || deleting}
              className="mt-4 w-full rounded-lg bg-accent py-3.5 font-semibold text-paper disabled:opacity-40"
            >
              {deleting ? 'Deleting…' : 'Delete my account permanently'}
            </button>
            <button onClick={() => setConfirming(false)} className="mt-2 w-full py-2.5 text-[14px] font-medium text-muted">Cancel</button>
          </div>
        </div>
      )}
    </>
  );
}
