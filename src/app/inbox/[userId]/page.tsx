'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Message, Profile } from '@/lib/types';
import { useSession } from '@/lib/session';
import { Avatar, timeAgo } from '@/components/ui';

/** A story someone sent, rendered as a card inside the conversation. */
function StoryBubble({ message, mine }: { message: Message; mine: boolean }) {
  const story = message.story;
  if (!story) {
    return <p className={`text-[13px] italic ${mine ? 'text-paper/70' : 'text-muted'}`}>This story is no longer available.</p>;
  }
  return (
    <a
      href={story.original_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block overflow-hidden rounded-xl border ${mine ? 'border-paper/20 bg-paper/10' : 'border-rule bg-white'}`}
    >
      {story.image_url && (
        <span className="relative block aspect-[16/9] w-full bg-rule">
          <Image src={story.image_url} alt="" fill sizes="240px" className="object-cover" unoptimized />
        </span>
      )}
      <span className="block p-3">
        <span className={`block font-serif text-[14.5px] font-semibold leading-snug ${mine ? 'text-paper' : 'text-ink'}`}>
          {story.title}
        </span>
        <span className={`mt-1 block text-[11.5px] ${mine ? 'text-paper/65' : 'text-muted'}`}>{story.source_name}</span>
      </span>
    </a>
  );
}

export default function ThreadPage() {
  const params = useParams();
  const userId = String(params.userId);
  const { me, friends, conversations, loadThread, sendMessage, markConversationRead } = useSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const myId = me?.id ?? 'me';
  const partner: Profile | undefined =
    conversations.find((c) => c.user.id === userId)?.user ?? friends.find((f) => f.id === userId);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadThread(userId).then((rows) => {
      if (cancelled) return;
      setMessages(rows);
      setLoading(false);
    });
    markConversationRead(userId);
    return () => { cancelled = true; };
    // markConversationRead is intentionally not a dep — it would re-fire on every inbox change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loadThread]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const submit = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    const optimistic: Message = {
      id: `pending-${Date.now()}`, sender_id: myId, recipient_id: userId,
      content: trimmed, story_id: null, created_at: new Date().toISOString(), read: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    await sendMessage(userId, trimmed);
    setSending(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-rule bg-paper/95 px-3 py-2.5 backdrop-blur-sm">
        <Link href="/inbox" aria-label="Back to inbox" className="flex h-9 w-9 items-center justify-center rounded-full text-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </Link>
        {partner ? (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={partner.display_name || partner.username} size={34} />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-tight">{partner.display_name || partner.username}</span>
              <span className="block truncate text-[12px] text-muted">@{partner.username}</span>
            </span>
          </span>
        ) : (
          <span className="text-[15px] font-semibold">Conversation</span>
        )}
      </header>

      <div className="flex-1 px-4 py-4">
        {loading ? (
          <p className="pt-16 text-center text-[14px] text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <div className="pt-16 text-center">
            <p className="font-serif text-xl font-semibold">Say hello.</p>
            <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
              Send a message, or share a story from the feed to start things off.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const mine = m.sender_id === myId;
              return (
                <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] ${m.story_id ? 'w-[240px]' : ''}`}>
                    <div className={`rounded-2xl px-3.5 py-2.5 ${mine ? 'bg-ink text-paper' : 'bg-rule/50 text-ink'} ${m.story_id ? 'p-2' : ''}`}>
                      {m.story_id ? <StoryBubble message={m} mine={mine} /> : <p className="text-[14.5px] leading-snug">{m.content}</p>}
                    </div>
                    <p className={`mt-1 text-[11px] text-muted ${mine ? 'text-right' : ''}`}>{timeAgo(m.created_at)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={endRef} />
      </div>

      <div className="sticky bottom-16 border-t border-rule bg-paper px-3 py-2.5">
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Message…"
            aria-label="Write a message"
            className="min-w-0 flex-1 rounded-full border border-rule bg-white px-4 py-2.5 text-[14.5px] outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            className="shrink-0 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
