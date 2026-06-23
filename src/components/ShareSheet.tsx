'use client';

import { useState } from 'react';
import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';
import { Avatar } from './ui';

export default function ShareSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { friends, shareToFriend } = useSession();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  const send = (friendId: string) => {
    shareToFriend(story.id, friendId);
    setSentTo((prev) => new Set(prev).add(friendId));
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Send to a friend">
      <button className="absolute inset-0 bg-ink/40" onClick={onClose} aria-label="Close" />
      <div className="relative w-full rounded-t-2xl bg-paper p-5 pb-8 animate-fadeUp">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
        <h3 className="font-serif text-lg font-bold">Send to a friend</h3>
        <p className="mt-0.5 text-[13px] text-muted line-clamp-1">{story.title}</p>
        <ul className="mt-4 space-y-1">
          {friends.length === 0 && <li className="py-6 text-center text-sm text-muted">No friends yet. Add some from the Friends tab.</li>}
          {friends.map((f) => {
            const sent = sentTo.has(f.id);
            return (
              <li key={f.id} className="flex items-center justify-between rounded-lg px-2 py-2">
                <span className="flex items-center gap-3">
                  <Avatar name={f.display_name || f.username} size={36} />
                  <span>
                    <span className="block font-medium leading-tight">{f.display_name || f.username}</span>
                    <span className="block text-[12px] text-muted">@{f.username}</span>
                  </span>
                </span>
                <button onClick={() => send(f.id)} disabled={sent}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-semibold ${sent ? 'bg-rule text-muted' : 'bg-ink text-paper active:bg-accent'}`}>
                  {sent ? 'Sent' : 'Send'}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
