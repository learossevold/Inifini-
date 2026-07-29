'use client';

import { useEffect, useState } from 'react';
import { useSession, MOCK_USERS } from '@/lib/session';
import { supabaseBrowser } from '@/lib/supabase';
import { searchProfiles } from '@/lib/social';
import { Profile } from '@/lib/types';
import { Avatar } from '@/components/ui';

export default function FriendsPage() {
  const { friends, friendRequests, acceptFriend, declineFriend, sendFriendRequest, me, configured, canAct, promptSignIn } = useSession();
  const [query, setQuery] = useState('');
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Profile[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const friendIds = new Set(friends.map((f) => f.id));

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults([]); return; }

    if (!configured) {
      setResults(MOCK_USERS.filter((u) => u.id !== 'me' && (u.username.includes(q) || u.display_name.toLowerCase().includes(q))));
      return;
    }

    const db = supabaseBrowser();
    if (!db || !me) { setResults([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const found = await searchProfiles(db, q, me.id);
      if (!cancelled) setResults(found);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, configured, me]);

  const visibleResults = results.filter((u) => !friendIds.has(u.id));

  const add = async (id: string) => {
    setRequested((p) => new Set(p).add(id));
    setErr(null);
    if (configured) {
      const { error } = await sendFriendRequest(id);
      if (error) {
        setErr(error);
        setRequested((p) => { const n = new Set(p); n.delete(id); return n; });
      }
    }
  };

  return (
    <main className="px-5 py-6">
      <h1 className="font-serif text-2xl font-bold">Friends</h1>
      <p className="mt-1 text-[13px] text-muted">Friendships are mutual and private. No public follower counts.</p>

      {!canAct && (
        <section className="mt-5 rounded-xl border border-rule bg-accentSoft/40 px-5 py-5 text-center">
          <p className="text-[14px] text-muted">Create an account to add friends and send them stories.</p>
          <button
            onClick={() => promptSignIn('Sign in to add friends.')}
            className="mt-4 w-full rounded-lg bg-ink py-3 font-semibold text-paper"
          >
            Create account or sign in
          </button>
        </section>
      )}

      {/* Add by username */}
      <div className="mt-5 flex items-center rounded-lg border border-rule bg-white px-3">
        <span className="text-muted">@</span>
        <input value={query} onChange={(e) => setQuery(e.target.value.toLowerCase())} placeholder="Find people by username" className="w-full bg-transparent px-2 py-2.5 outline-none" />
      </div>
      {err && <p className="mt-2 text-[13px] text-accent">{err}</p>}
      {visibleResults.length > 0 && (
        <ul className="mt-2 space-y-1">
          {visibleResults.map((u) => {
            const sent = requested.has(u.id);
            return (
              <li key={u.id} className="flex items-center justify-between rounded-lg px-1 py-2">
                <span className="flex items-center gap-3"><Avatar name={u.display_name || u.username} size={36} /><span><span className="block font-medium leading-tight">{u.display_name}</span><span className="block text-[12px] text-muted">@{u.username}</span></span></span>
                <button onClick={() => add(u.id)} disabled={sent} className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${sent ? 'bg-rule text-muted' : 'bg-ink text-paper'}`}>{sent ? 'Requested' : 'Add'}</button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Requests */}
      {friendRequests.length > 0 && (
        <section className="mt-8">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Requests</h2>
          <ul className="mt-3 space-y-2">
            {friendRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg px-1 py-2">
                <span className="flex items-center gap-3"><Avatar name={r.display_name || r.username} size={40} /><span><span className="block font-medium leading-tight">{r.display_name}</span><span className="block text-[12px] text-muted">@{r.username}</span></span></span>
                <span className="flex gap-2">
                  <button onClick={() => acceptFriend(r.id)} className="rounded-full bg-ink px-4 py-1.5 text-[13px] font-semibold text-paper">Accept</button>
                  <button onClick={() => declineFriend(r.id)} className="rounded-full border border-rule px-3 py-1.5 text-[13px] text-muted">Decline</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends */}
      <section className="mt-8">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your friends · {friends.length}</h2>
        {friends.length === 0 ? <p className="mt-3 text-[14px] text-muted">No friends yet. Find people by username above.</p> : (
          <ul className="mt-3 space-y-2">
            {friends.map((f) => (
              <li key={f.id} className="flex items-center gap-3 rounded-lg px-1 py-2">
                <Avatar name={f.display_name || f.username} size={40} />
                <span><span className="block font-medium leading-tight">{f.display_name}</span><span className="block text-[12px] text-muted">@{f.username}</span></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
