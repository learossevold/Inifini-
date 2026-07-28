'use client';

import { useMemo, useState } from 'react';
import { Story } from '@/lib/types';
import { useSession } from '@/lib/session';
import { Avatar } from './ui';

/**
 * Share sheet, TikTok-style: friends on the app first (sends the story straight
 * into their inbox as a message), then external platforms, then per-story
 * utilities. External links point at the original publisher's URL — the story
 * of record — never a fabricated Inifini link.
 */

function ChannelGlyph({ id }: { id: string }) {
  const s = { width: 26, height: 26, viewBox: '0 0 24 24', fill: 'currentColor' };
  switch (id) {
    case 'copy':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" /><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" /></svg>;
    case 'whatsapp':
      return <svg {...s}><path d="M12.04 2A9.9 9.9 0 0 0 2.1 11.9c0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.9 9.9 0 0 0 4.74 1.2 9.9 9.9 0 0 0 9.9-9.9A9.9 9.9 0 0 0 12.04 2zm5.8 14.06c-.24.68-1.4 1.3-1.94 1.35-.5.05-.97.23-3.27-.68-2.75-1.08-4.5-3.87-4.64-4.05-.13-.18-1.1-1.47-1.1-2.8 0-1.33.7-1.98.94-2.25.25-.27.54-.34.72-.34l.52.01c.17 0 .4-.06.62.47.23.55.78 1.9.85 2.04.07.13.11.29.02.47-.09.18-.13.29-.26.45l-.4.46c-.13.13-.26.28-.11.54.15.27.66 1.09 1.42 1.76.97.87 1.79 1.14 2.05 1.27.26.13.4.11.55-.07.15-.18.63-.74.8-.99.17-.25.34-.2.57-.12.23.09 1.47.69 1.72.82.25.13.42.2.48.3.06.11.06.63-.18 1.31z" /></svg>;
    case 'messenger':
      return <svg {...s}><path d="M12 2C6.3 2 2 6.2 2 11.8c0 3.2 1.4 6 3.7 7.8V23l3.4-1.9c.9.3 1.9.4 2.9.4 5.7 0 10-4.2 10-9.7S17.7 2 12 2zm1 13.1-2.6-2.7-5 2.7 5.5-5.8 2.6 2.7 4.9-2.7-5.4 5.8z" /></svg>;
    case 'snapchat':
      return <svg {...s}><path d="M12 2.2c2.7 0 4.8 2.2 4.9 4.9 0 .6 0 1.3-.1 1.9.3.1.6.1.9 0 .5-.1 1 .2 1.1.6.1.5-.2 1-.7 1.1-.2 0-.6.2-1 .4-.3.2-.4.4-.3.7.5 1.4 1.6 2.5 3 3 .4.1.6.5.5.9-.2.8-1.6 1.1-2.5 1.2-.2.4-.2.9-.4 1.1-.2.2-.5.2-.9.1-.5-.1-1-.2-1.6-.1-.6.1-1.1.4-1.6.8-.6.4-1.2.8-2.3.8s-1.7-.4-2.3-.8c-.5-.4-1-.7-1.6-.8-.6-.1-1.1 0-1.6.1-.4.1-.7.1-.9-.1-.2-.2-.2-.7-.4-1.1-.9-.1-2.3-.4-2.5-1.2-.1-.4.1-.8.5-.9 1.4-.5 2.5-1.6 3-3 .1-.3 0-.5-.3-.7-.4-.2-.8-.4-1-.4-.5-.1-.8-.6-.7-1.1.1-.4.6-.7 1.1-.6.3.1.6.1.9 0-.1-.6-.1-1.3-.1-1.9C7.2 4.4 9.3 2.2 12 2.2z" /></svg>;
    case 'x':
      return <svg {...s}><path d="M17.5 3h3l-6.6 7.5L21.7 21h-6l-4.7-6.1L5.6 21h-3l7-8L2.6 3h6.2l4.2 5.6L17.5 3zm-1 16h1.6L7.6 4.7H5.9L16.5 19z" /></svg>;
    case 'email':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6.5 8.5 5.5 8.5-5.5" /></svg>;
    case 'more':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>;
    case 'save':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
    case 'notinterested':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></svg>;
    case 'report':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V4h9l.6 2H20v9h-7l-.6-2H4" /></svg>;
    case 'original':
      return <svg {...s} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>;
    default:
      return null;
  }
}

export default function ShareSheet({ story, onClose }: { story: Story; onClose: () => void }) {
  const { friends, shareToFriend, saves, toggleSave } = useSession();
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const url = story.original_url;
  const encUrl = encodeURIComponent(url);
  const encText = encodeURIComponent(story.title);
  const saved = saves.has(story.id);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(q) || f.display_name.toLowerCase().includes(q));
  }, [friends, query]);

  const flash = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 1800); };

  const send = (friendId: string) => {
    shareToFriend(story.id, friendId);
    setSentTo((prev) => new Set(prev).add(friendId));
  };

  const openExternal = (href: string) => window.open(href, '_blank', 'noopener,noreferrer');

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); flash('Link copied'); }
    catch { flash('Could not copy the link'); }
  };

  const nativeShare = async () => {
    if (!navigator.share) { copyLink(); return; }
    try { await navigator.share({ title: story.title, url }); }
    catch { /* dismissed — nothing to report */ }
  };

  // Brand colours, so each channel is recognisable at a glance.
  const channels = [
    { id: 'copy', label: 'Copy link', bg: '#2C3E9E', fg: '#FFFFFF', onClick: copyLink },
    { id: 'whatsapp', label: 'WhatsApp', bg: '#25D366', fg: '#FFFFFF', onClick: () => openExternal(`https://wa.me/?text=${encText}%20${encUrl}`) },
    { id: 'messenger', label: 'Messenger', bg: '#0084FF', fg: '#FFFFFF', onClick: () => openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encUrl}`) },
    { id: 'snapchat', label: 'Snapchat', bg: '#FFFC00', fg: '#14152D', onClick: () => openExternal(`https://www.snapchat.com/scan?attachmentUrl=${encUrl}`) },
    { id: 'x', label: 'X', bg: '#14152D', fg: '#FFFFFF', onClick: () => openExternal(`https://x.com/intent/tweet?text=${encText}&url=${encUrl}`) },
    { id: 'email', label: 'Email', bg: '#676B78', fg: '#FFFFFF', onClick: () => { window.location.href = `mailto:?subject=${encText}&body=${encUrl}`; } },
    { id: 'more', label: 'More', bg: '#ECEBF0', fg: '#14152D', onClick: nativeShare },
  ];

  const utilities = [
    { id: 'save', label: saved ? 'Saved' : 'Save', onClick: () => { toggleSave(story.id); flash(saved ? 'Removed from saved' : 'Saved to your profile'); } },
    { id: 'original', label: 'Original', onClick: () => openExternal(url) },
    { id: 'notinterested', label: 'Not interested', onClick: () => flash('We’ll show fewer stories like this') },
    { id: 'report', label: 'Report', onClick: () => flash('Thanks — our team will take a look') },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Send this story">
      <button className="absolute inset-0 bg-ink/50" onClick={onClose} aria-label="Close" />

      <div className="relative max-h-[88vh] w-full overflow-y-auto rounded-t-2xl bg-paper pb-8 animate-fadeUp">
        {/* Header: search · title · close */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-paper px-5 pb-3 pt-4">
          <button
            onClick={() => setSearching((v) => !v)}
            aria-label="Search friends"
            aria-pressed={searching}
            className={`flex h-9 w-9 items-center justify-center rounded-full ${searching ? 'bg-accentSoft text-accent' : 'text-ink'}`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          <h2 className="font-sans text-[16px] font-bold">Send to</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        {searching && (
          <div className="px-5 pb-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search friends"
              aria-label="Search friends"
              className="w-full rounded-full border border-rule bg-white px-4 py-2.5 text-[14px] outline-none focus:border-accent"
            />
          </div>
        )}

        <p className="px-5 pb-1 text-[13px] text-muted line-clamp-1">{story.title}</p>

        {/* Friends rail */}
        {shown.length === 0 ? (
          <p className="px-5 py-5 text-[14px] text-muted">
            {friends.length === 0 ? 'No friends yet. Add some from the Friends tab.' : 'No friends match that name.'}
          </p>
        ) : (
          <ul className="no-scrollbar mt-3 flex gap-4 overflow-x-auto px-5 pb-2">
            {shown.map((f) => {
              const sent = sentTo.has(f.id);
              return (
                <li key={f.id} className="shrink-0">
                  <button onClick={() => send(f.id)} disabled={sent} className="flex w-[68px] flex-col items-center gap-1.5">
                    <span className="relative">
                      <Avatar name={f.display_name || f.username} size={60} />
                      {sent && (
                        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-accent/90 text-paper" aria-hidden>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>
                        </span>
                      )}
                    </span>
                    <span className="w-full truncate text-center text-[11.5px] leading-tight text-ink">
                      {sent ? 'Sent' : (f.display_name || f.username)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* External channels */}
        <div className="mt-4 border-t border-rule pt-4">
          <ul className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1">
            {channels.map((c) => (
              <li key={c.id} className="shrink-0">
                <button onClick={c.onClick} className="flex w-[68px] flex-col items-center gap-1.5">
                  <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full" style={{ background: c.bg, color: c.fg }}>
                    <ChannelGlyph id={c.id} />
                  </span>
                  <span className="w-full truncate text-center text-[11.5px] leading-tight text-ink">{c.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Story utilities */}
        <div className="mt-4 border-t border-rule pt-4">
          <ul className="no-scrollbar flex gap-4 overflow-x-auto px-5 pb-1">
            {utilities.map((u) => (
              <li key={u.id} className="shrink-0">
                <button onClick={u.onClick} className="flex w-[68px] flex-col items-center gap-1.5">
                  <span className={`flex h-[54px] w-[54px] items-center justify-center rounded-full ${u.id === 'save' && saved ? 'bg-accentSoft text-accent' : 'bg-rule/60 text-ink'}`}>
                    <ChannelGlyph id={u.id} />
                  </span>
                  <span className="w-full truncate text-center text-[11.5px] leading-tight text-muted">{u.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {toast && <p role="status" className="mt-4 px-5 text-center text-[13px] font-medium text-accent">{toast}</p>}
      </div>
    </div>
  );
}
