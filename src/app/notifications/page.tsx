'use client';

import Link from 'next/link';
import { useSession } from '@/lib/session';
import { Avatar, timeAgo } from '@/components/ui';

export default function NotificationsPage() {
  const { inbox, friendRequests, markInboxRead, acceptFriend, declineFriend } = useSession();
  const hasAny = inbox.length > 0 || friendRequests.length > 0;

  return (
    <main className="px-5 py-6">
      <h1 className="font-serif text-2xl font-bold">Notifications</h1>

      {!hasAny && <p className="mt-8 text-center text-[14px] text-muted">You’re all caught up.</p>}

      {friendRequests.length > 0 && (
        <section className="mt-6">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Friend requests</h2>
          <ul className="mt-3 space-y-2">
            {friendRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg border border-rule px-3 py-2.5">
                <span className="flex items-center gap-3"><Avatar name={r.display_name || r.username} size={38} /><span className="text-[14px]"><span className="font-semibold">{r.display_name}</span> wants to be friends</span></span>
                <span className="flex gap-2">
                  <button onClick={() => acceptFriend(r.id)} className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-paper">Accept</button>
                  <button onClick={() => declineFriend(r.id)} className="rounded-full border border-rule px-3 py-1.5 text-[12px] text-muted">Decline</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inbox.length > 0 && (
        <section className="mt-8">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Sent to you</h2>
          <ul className="mt-3 space-y-2">
            {inbox.map((s) => (
              <li key={s.id}>
                <Link href="/" onClick={() => markInboxRead(s.id)} className={`flex gap-3 rounded-lg border px-3 py-3 ${s.read ? 'border-rule' : 'border-accent/40 bg-accentSoft/40'}`}>
                  <Avatar name={s.from?.display_name || s.from?.username || 'U'} size={38} />
                  <span className="min-w-0">
                    <span className="text-[14px]"><span className="font-semibold">{s.from?.display_name}</span> sent you a story · <span className="text-muted">{timeAgo(s.created_at)}</span></span>
                    <span className="mt-0.5 block font-serif text-[15px] font-semibold leading-snug line-clamp-2">{s.story?.title}</span>
                  </span>
                  {!s.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
