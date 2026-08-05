'use client';

import { useEffect, useRef, useState } from 'react';
import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';

/**
 * Quick-comment popup: tapping the comment icon opens straight to writing
 * one, instead of only reaching a comment box by opening the full article
 * and scrolling past everything else in it. A flat, unthreaded view (no
 * replies/likes/hide) on purpose — the full Comments component still
 * covers those once the article itself is actually open; this is the fast
 * path for "I just want to say something," matching what Watch already
 * did before News/Explore got it too.
 */
export default function CommentSheet({ story, onClose, dark = false }: { story: Story; onClose: () => void; dark?: boolean }) {
  const { addComment, commentsByStory, ensureComments } = useSession();
  useEffect(() => { ensureComments(story.id); }, [story.id, ensureComments]);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const comments = commentsByStory[story.id] ?? [];

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment(story.id, trimmed, null);
    setText('');
    inputRef.current?.focus();
  };

  const sheetBg = dark ? 'bg-[#14152C]' : 'bg-white';
  const headerText = dark ? 'text-white/70' : 'text-muted';
  const closeText = dark ? 'text-white/50' : 'text-muted';
  const handle = dark ? 'bg-white/20' : 'bg-rule';
  const emptyText = dark ? 'text-white/40' : 'text-muted';
  const avatarBg = dark ? 'bg-white/15 text-white' : 'bg-accentSoft text-ink';
  const authorText = dark ? 'text-white/80' : 'text-ink';
  const bodyText = dark ? 'text-white/90' : 'text-ink/90';
  const inputField = dark
    ? 'flex-1 rounded-full border border-white/15 bg-white/8 px-4 py-2 text-[14px] text-white placeholder:text-white/35 focus:outline-none'
    : 'flex-1 rounded-full border border-rule bg-paper px-4 py-2 text-[14px] text-ink placeholder:text-muted focus:outline-none';
  const inputBorder = dark ? 'border-white/10' : 'border-rule';
  const postBtn = dark ? 'bg-white text-black' : 'bg-ink text-paper';

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" role="dialog" aria-modal="true">
      {/* semi-transparent backdrop — tap to close */}
      <button className="absolute inset-0 bg-black/40" onClick={onClose} aria-label="Close comments" />

      {/* sheet — 65 vh, rounded top */}
      <div className={`relative flex h-[65vh] flex-col rounded-t-2xl shadow-2xl animate-fadeUp ${sheetBg}`}>
        {/* drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className={`h-1 w-10 rounded-full ${handle}`} />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-4 pb-3">
          <span className={`font-sans text-[13px] font-semibold ${headerText}`}>
            {comments.length > 0 ? `${comments.length} comment${comments.length !== 1 ? 's' : ''}` : 'Comments'}
          </span>
          <button onClick={onClose} className={`text-lg leading-none ${closeText}`}>✕</button>
        </div>

        {/* comment list */}
        <div className="flex-1 overflow-y-auto px-4 space-y-4">
          {comments.length === 0 ? (
            <p className={`pt-8 text-center text-[14px] ${emptyText}`}>No comments yet. Be the first!</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <div className={`mt-0.5 h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-bold ${avatarBg}`}>
                  {(c.author?.display_name || c.author?.username || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className={`text-[13px] font-semibold ${authorText}`}>{c.author?.display_name || c.author?.username}</p>
                  <p className={`text-[14px] leading-snug ${bodyText}`}>{c.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* input row */}
        <div className={`border-t px-4 py-3 flex items-center gap-3 ${inputBorder}`}>
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Add a comment…"
            className={inputField}
          />
          <button
            onClick={submit}
            disabled={!text.trim()}
            className={`rounded-full px-4 py-2 text-[13px] font-semibold disabled:opacity-35 ${postBtn}`}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
