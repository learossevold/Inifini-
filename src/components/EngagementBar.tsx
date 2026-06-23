'use client';

import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';
import { HeartIcon, BookmarkIcon, CommentIcon, ShareIcon, compact } from './ui';

export default function EngagementBar({
  story, onComment, onShare, vertical = false, dark = false,
}: {
  story: Story;
  onComment: () => void;
  onShare: () => void;
  vertical?: boolean;
  dark?: boolean;
}) {
  const { likes, saves, toggleLike, toggleSave, commentsByStory } = useSession();
  const liked = likes.has(story.id);
  const saved = saves.has(story.id);
  const localComments = commentsByStory[story.id]?.length ?? 0;
  const commentTotal = story.comment_count + localComments;
  const likeTotal = story.like_count + (liked ? 1 : 0);

  const base = dark ? 'text-white' : 'text-ink';
  const active = 'text-accent';
  const wrap = vertical ? 'flex flex-col items-center gap-5' : 'flex items-center gap-6';
  const item = vertical ? 'flex flex-col items-center gap-1' : 'flex items-center gap-1.5';
  const count = vertical ? 'text-[11px] font-semibold' : 'text-[13px] font-medium';

  return (
    <div className={wrap}>
      <button onClick={() => toggleLike(story.id)} className={`${item} ${liked ? active : base}`} aria-pressed={liked} aria-label="Like">
        <HeartIcon filled={liked} />
        <span className={count}>{compact(likeTotal)}</span>
      </button>
      <button onClick={onComment} className={`${item} ${base}`} aria-label="Comments">
        <CommentIcon />
        <span className={count}>{compact(commentTotal)}</span>
      </button>
      <button onClick={() => toggleSave(story.id)} className={`${item} ${saved ? active : base}`} aria-pressed={saved} aria-label="Save">
        <BookmarkIcon filled={saved} />
        {!vertical && <span className={count}>Save</span>}
      </button>
      <button onClick={onShare} className={`${item} ${base}`} aria-label="Share to a friend">
        <ShareIcon />
        {!vertical && <span className={count}>Send</span>}
      </button>
    </div>
  );
}
