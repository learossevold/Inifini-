'use client';

import { useMemo, useState } from 'react';
import { Comment, Story } from '@/lib/types';
import { useSession } from '@/lib/session';
import { Avatar, HeartIcon, timeAgo, compact } from './ui';

const BANNED = ['idiot', 'hate', 'kill yourself', 'kys', 'slur'];
function clean(text: string): { ok: boolean; reason?: string } {
  const lower = text.toLowerCase();
  if (text.trim().length === 0) return { ok: false, reason: 'Write something first.' };
  if (text.length > 600) return { ok: false, reason: 'Keep it under 600 characters.' };
  if (BANNED.some((w) => lower.includes(w))) return { ok: false, reason: 'That comment may break our guidelines.' };
  return { ok: true };
}

function CommentRow({ story, c, depth, dark = false }: { story: Story; c: Comment; depth: number; dark?: boolean }) {
  const { likeComment, addComment } = useSession();
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [hidden, setHidden] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const muted = dark ? 'text-white/60' : 'text-muted';
  const field = dark
    ? 'w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[14px] text-white placeholder:text-white/40'
    : 'w-full resize-none rounded-lg border border-rule bg-white px-3 py-2 text-[14px]';
  const rule = dark ? 'border-white/15' : 'border-rule';

  if (hidden) {
    return <p className={`py-2 pl-1 text-[13px] italic ${muted}`}>Comment hidden. <button onClick={() => setHidden(false)} className="underline">Undo</button></p>;
  }

  const submitReply = () => {
    const v = clean(text);
    if (!v.ok) { setErr(v.reason!); return; }
    addComment(story.id, text.trim(), c.id);
    setText(''); setReplying(false); setErr(null);
  };

  return (
    <div className={depth > 0 ? `ml-9 mt-3 border-l ${rule} pl-3` : 'mt-4'}>
      <div className="flex gap-2.5">
        <Avatar name={c.author?.display_name || c.author?.username || 'U'} size={30} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px]">
            <span className="font-semibold">{c.author?.display_name || c.author?.username}</span>
            <span className={`ml-2 ${muted}`}>{timeAgo(c.created_at)}</span>
          </p>
          <p className="mt-0.5 text-[14px] leading-snug">{c.content}</p>
          <div className={`mt-1.5 flex items-center gap-4 text-[12px] ${muted}`}>
            <button onClick={() => likeComment(story.id, c.id)} className={`flex items-center gap-1 ${c.liked_by_me ? 'text-accent' : ''}`}>
              <span className="scale-[0.65]"><HeartIcon filled={c.liked_by_me} /></span>
              {c.like_count ? compact(c.like_count) : 'Like'}
            </button>
            {depth === 0 && <button onClick={() => setReplying((r) => !r)}>Reply</button>}
            <button onClick={() => setHidden(true)} className="ml-auto">Hide</button>
          </div>

          {replying && (
            <div className="mt-2">
              <textarea value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} rows={2} placeholder="Write a reply…"
                className={field} />
              {err && <p className="mt-1 text-[12px] text-accent">{err}</p>}
              <div className="mt-1.5 flex justify-end gap-2">
                <button onClick={() => { setReplying(false); setErr(null); }} className={`px-3 py-1 text-[13px] ${muted}`}>Cancel</button>
                <button onClick={submitReply} className={`rounded-full px-4 py-1 text-[13px] font-semibold ${dark ? 'bg-white text-night' : 'bg-ink text-paper'}`}>Reply</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {c.replies?.map((r) => <CommentRow key={r.id} story={story} c={r} depth={depth + 1} dark={dark} />)}
    </div>
  );
}

export default function Comments({ story, dark = false }: { story: Story; dark?: boolean }) {
  const { commentsByStory, addComment } = useSession();
  const comments = useMemo(() => commentsByStory[story.id] ?? [], [commentsByStory, story.id]);
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const muted = dark ? 'text-white/60' : 'text-muted';
  const field = dark
    ? 'w-full resize-none rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[14px] text-white placeholder:text-white/40'
    : 'w-full resize-none rounded-lg border border-rule bg-white px-3 py-2 text-[14px]';

  const submit = () => {
    const v = clean(text);
    if (!v.ok) { setErr(v.reason!); return; }
    addComment(story.id, text.trim(), null);
    setText(''); setErr(null);
  };

  return (
    <section className="mt-6">
      <h3 className={`font-sans text-[11px] font-semibold uppercase tracking-[0.18em] ${muted}`}>
        Comments {comments.length > 0 && `· ${comments.length}`}
      </h3>

      <div className="mt-3">
        <textarea value={text} onChange={(e) => { setText(e.target.value); setErr(null); }} rows={2} placeholder="Add a comment…"
          className={field} />
        {err && <p className="mt-1 text-[12px] text-accent">{err}</p>}
        <div className="mt-1.5 flex justify-end">
          <button onClick={submit} className={`rounded-full px-5 py-1.5 text-[13px] font-semibold active:bg-accent ${dark ? 'bg-white text-night' : 'bg-ink text-paper'}`}>Post</button>
        </div>
      </div>

      {comments.length === 0 ? (
        <p className={`mt-4 text-[14px] ${muted}`}>No comments yet. Start the conversation.</p>
      ) : (
        <div className="mt-2">{comments.map((c) => <CommentRow key={c.id} story={story} c={c} depth={0} dark={dark} />)}</div>
      )}
    </section>
  );
}
