import { CATEGORIES, Story } from '@/lib/types';

export function categoryLabel(id: string): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function compact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function importanceLevel(s: Story): 'high' | 'medium' | 'low' {
  if (s.importance_score >= 80) return 'high';
  if (s.importance_score >= 55) return 'medium';
  return 'low';
}

export function ImportanceMarker({ story }: { story: Story }) {
  const level = importanceLevel(story);
  const filled = level === 'high' ? 3 : level === 'medium' ? 2 : 1;
  const label = level === 'high' ? 'High importance' : level === 'medium' ? 'Medium importance' : 'Lower importance';
  return (
    <span aria-label={label} title={label} className="tracking-[0.2em] text-[9px] leading-none">
      {Array.from({ length: 3 }, (_, i) => (
        <span key={i} className={i < filled ? (level === 'high' ? 'text-accent' : 'text-ink') : 'text-rule'}>●</span>
      ))}
    </span>
  );
}

// Minimal inline icons (no icon library dependency)
export function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}
export function BookmarkIcon({ filled }: { filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}
export function CommentIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 1 1 16.1-3.8z" />
    </svg>
  );
}
export function ShareIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" />
    </svg>
  );
}
export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-accentSoft font-sans font-semibold text-accent" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {initials}
    </span>
  );
}
