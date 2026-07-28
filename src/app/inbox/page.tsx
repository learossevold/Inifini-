'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useSession } from '@/lib/session';
import { Avatar, timeAgo } from '@/components/ui';

/** One-line preview of a conversation's latest message. */
function preview(lastMessage: { content: string | null; story_id: string | null; story?: { title: string } }, mine: boolean): string {
  const body = lastMessage.content
    ? lastMessage.content
    : lastMessage.story?.title
      ? `📰 ${lastMessage.story.title}`
      : 'Shared a story';
  return mine ? `You: ${body}` : body;
}

export default function InboxPage() {
  const { me, conversations, friendRequests, acceptFriend, declineFriend } = useSession();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showRequests, setShowRequests] = useState(false);

  const myId = me?.id ?? 'me';
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.user.username.toLowerCase().includes(q) || c.user.display_name.toLowerCase().includes(q));
  }, [conversations, query]);

  return (
    <main className="pb-4">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-rule bg-paper/95 px-4 py-3 backdrop-blur-sm">
        <Link href="/friends" aria-label="Add friends" className="flex h-9 w-9 items-center justify-center rounded-full text-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
          </svg>
        </Link>
        <h1 className="font-sans text-[17px] font-bold">Inbox</h1>
        <button
          onClick={() => setSearching((v) => !v)}
          aria-label="Search conversations"
          aria-pressed={searching}
          className={`flex h-9 w-9 items-center justify-center rounded-full ${searching ? 'bg-accentSoft text-accent' : 'text-ink'}`}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
        </button>
      </header>

      {searching && (
        <div className="px-4 pt-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full rounded-full border border-rule bg-white px-4 py-2.5 text-[14px] outline-none focus:border-accent"
          />
        </div>
      )}

      {/* Friend requests — a system row that opens into the list */}
      {friendRequests.length > 0 && (
        <section className="border-b border-rule">
          <button onClick={() => setShowRequests((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left active:bg-accentSoft/40">
            <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-accent text-paper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">Friend requests</span>
              <span className="block truncate text-[13.5px] text-muted">
                {friendRequests[0].display_name || friendRequests[0].username}
                {friendRequests.length > 1
                  ? ` and ${friendRequests.length - 1} other${friendRequests.length > 2 ? 's' : ''} want to be friends`
                  : ' wants to be friends'}
              </span>
            </span>
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-paper">
              {friendRequests.length}
            </span>
          </button>

          {showRequests && (
            <ul className="bg-accentSoft/25 px-4 pb-3">
              {friendRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar name={r.display_name || r.username} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-semibold">{r.display_name || r.username}</span>
                      <span className="block truncate text-[12px] text-muted">@{r.username}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button onClick={() => acceptFriend(r.id)} className="rounded-full bg-ink px-3.5 py-1.5 text-[12px] font-semibold text-paper">Accept</button>
                    <button onClick={() => declineFriend(r.id)} className="rounded-full border border-rule px-3 py-1.5 text-[12px] text-muted">Decline</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Conversations */}
      {shown.length === 0 ? (
        <div className="px-8 pt-20 text-center">
          <p className="font-serif text-xl font-semibold">
            {conversations.length === 0 ? 'No messages yet.' : 'No conversations match that name.'}
          </p>
          {conversations.length === 0 && (
            <>
              <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
                Send a story to a friend and the conversation starts here.
              </p>
              <Link href="/friends" className="mt-5 inline-block rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-paper">Find friends</Link>
            </>
          )}
        </div>
      ) : (
        <ul>
          {shown.map((c) => {
            const mine = c.lastMessage.sender_id === myId;
            return (
              <li key={c.user.id}>
                <Link href={`/inbox/${c.user.id}`} className="flex items-center gap-3 px-4 py-3.5 active:bg-accentSoft/40">
                  <Avatar name={c.user.display_name || c.user.username} size={52} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[15px] ${c.unread > 0 ? 'font-bold' : 'font-semibold'}`}>
                      {c.user.display_name || c.user.username}
                    </span>
                    <span className={`block truncate text-[13.5px] ${c.unread > 0 ? 'text-ink' : 'text-muted'}`}>
                      {preview(c.lastMessage, mine)}
                      <span className="text-muted"> · {timeAgo(c.lastMessage.created_at)}</span>
                    </span>
                  </span>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-paper">
                      {c.unread}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
