'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { CATEGORIES, Category, Story } from '@/lib/types';
import { useSession } from '@/lib/session';
import { RSS_SOURCES } from '@/config/sources';
import { Avatar, categoryLabel, timeAgo } from '@/components/ui';
import NotificationToggle from '@/components/NotificationToggle';
import AccountSettings from '@/components/AccountSettings';

type Panel = 'saved' | 'liked' | 'interests';

function PanelIcon({ name, active }: { name: Panel; active: boolean }) {
  const common = {
    width: 22, height: 22, viewBox: '0 0 24 24',
    fill: active ? 'currentColor' : 'none',
    stroke: 'currentColor', strokeWidth: 1.8,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'saved':
      return <svg {...common}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
    case 'liked':
      return <svg {...common}><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" /></svg>;
    case 'interests':
      return <svg {...common} fill="none"><path d="M12 3l2.1 5.3L20 9.6l-4 4.1.9 5.9L12 16.9 7.1 19.6l.9-5.9-4-4.1 5.9-1.3z" /></svg>;
  }
}

/** A saved or liked story, as a compact row with its image. */
function StoryRow({ story }: { story: Story }) {
  return (
    <li>
      <Link href={`/s/${story.slug}`} className="flex gap-3 py-3">
        {story.image_url ? (
          <span className="relative block h-[62px] w-[86px] shrink-0 overflow-hidden rounded-md bg-rule">
            <Image src={story.image_url} alt="" fill sizes="86px" className="object-cover" unoptimized />
          </span>
        ) : (
          <span className="block h-[62px] w-[86px] shrink-0 rounded-md bg-rule" aria-hidden />
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-serif text-[15px] font-semibold leading-snug line-clamp-2">{story.title}</span>
          <span className="mt-1 block text-[12px] text-muted">{story.source_name} · {timeAgo(story.published_at)}</span>
        </span>
      </Link>
    </li>
  );
}

export default function ProfilePage() {
  const {
    me, interests, setInterests, followedSources, toggleSource,
    saves, likes, friends, configured, canAct, promptSignIn, loadStoriesByIds, signOut,
  } = useSession();

  const [panel, setPanel] = useState<Panel>('saved');
  const [savedStories, setSavedStories] = useState<Story[] | null>(null);
  const [likedStories, setLikedStories] = useState<Story[] | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Saved and liked ids are resolved against the database, not the demo set,
  // so they work for real accounts.
  useEffect(() => {
    let cancelled = false;
    loadStoriesByIds(Array.from(saves)).then((s) => { if (!cancelled) setSavedStories(s); });
    return () => { cancelled = true; };
  }, [saves, loadStoriesByIds]);

  useEffect(() => {
    let cancelled = false;
    loadStoriesByIds(Array.from(likes)).then((s) => { if (!cancelled) setLikedStories(s); });
    return () => { cancelled = true; };
  }, [likes, loadStoriesByIds]);

  const toggleInterest = (c: Category) =>
    setInterests(interests.includes(c) ? interests.filter((x) => x !== c) : [...interests, c]);

  // Following is by publisher, and several feeds can share one domain (BBC News,
  // BBC World, BBC Sport are all bbc.com). Keep the first, which is the
  // publisher's general feed, so the label names the publisher rather than
  // whichever section happened to be listed last.
  const sources = RSS_SOURCES.filter(
    (s, i) => RSS_SOURCES.findIndex((o) => o.domain === s.domain) === i
  );

  if (!canAct) {
    return (
      <main className="px-5 py-6">
        <section className="rounded-xl border border-rule bg-accentSoft/40 px-5 py-6 text-center">
          <h1 className="font-serif text-[22px] font-bold leading-snug">Make it yours.</h1>
          <p className="mx-auto mt-2 max-w-xs text-[14px] text-muted">
            Create an account to save stories, comment, add friends and send them what you&rsquo;re reading. Everything else stays open.
          </p>
          <button
            onClick={() => promptSignIn('Create your account')}
            className="mt-5 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper"
          >
            Create account or sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="pb-4">
      {/* Top row: add friends, settings */}
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/friends" aria-label="Friends" className="flex h-9 w-9 items-center justify-center text-ink">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
          </svg>
        </Link>
        <button
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          className="flex h-9 w-9 items-center justify-center text-ink"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {/* Identity */}
      <section className="flex flex-col items-center px-5">
        <Avatar name={me?.display_name || me?.username || 'You'} size={92} />
        <h1 className="mt-3 font-serif text-[22px] font-bold leading-tight">{me?.display_name || me?.username}</h1>
        <p className="text-[14px] text-muted">@{me?.username}</p>
        {me?.bio && <p className="mt-2 text-center font-serif text-[15px] text-ink/85">{me.bio}</p>}

        {/* Counts stay private: no follower numbers, by design. */}
        <dl className="mt-5 flex w-full max-w-xs items-stretch">
          {[
            ['Friends', friends.length],
            ['Saved', saves.size],
            ['Liked', likes.size],
          ].map(([label, n], i) => (
            <div key={label as string} className={`flex-1 text-center ${i > 0 ? 'border-l border-rule' : ''}`}>
              <dd className="font-sans text-[19px] font-bold tabular-nums">{n as number}</dd>
              <dt className="text-[12.5px] text-muted">{label as string}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Panels */}
      <nav className="mt-6 flex border-b border-rule" role="tablist">
        {(['saved', 'liked', 'interests'] as Panel[]).map((p) => (
          <button
            key={p}
            role="tab"
            aria-selected={panel === p}
            aria-label={p === 'saved' ? 'Saved stories' : p === 'liked' ? 'Liked stories' : 'Your interests'}
            onClick={() => setPanel(p)}
            className={`relative flex flex-1 justify-center py-3 ${panel === p ? 'text-ink' : 'text-muted'}`}
          >
            <PanelIcon name={p} active={panel === p} />
            {panel === p && <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-12 rounded-full bg-accent" />}
          </button>
        ))}
      </nav>

      <div className="px-5">
        {panel === 'saved' && (
          savedStories === null ? (
            <p className="py-10 text-center text-[14px] text-muted">Loading…</p>
          ) : savedStories.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-muted">Tap the bookmark on any story to keep it here.</p>
          ) : (
            <ul className="divide-y divide-rule">{savedStories.map((s) => <StoryRow key={s.id} story={s} />)}</ul>
          )
        )}

        {panel === 'liked' && (
          likedStories === null ? (
            <p className="py-10 text-center text-[14px] text-muted">Loading…</p>
          ) : likedStories.length === 0 ? (
            <p className="py-10 text-center text-[14px] text-muted">Stories you like will gather here.</p>
          ) : (
            <ul className="divide-y divide-rule">{likedStories.map((s) => <StoryRow key={s.id} story={s} />)}</ul>
          )
        )}

        {panel === 'interests' && (
          <div className="py-5">
            <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Topics</h2>
            <p className="mt-1 text-[13px] text-muted">Tap to add or remove. Your Explore feed updates straight away.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.id !== 'top').map((c) => {
                const on = interests.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleInterest(c.id)}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-2 text-[13.5px] ${on ? 'border-accent bg-accentSoft font-semibold text-accent' : 'border-rule text-ink'}`}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            <h2 className="mt-7 font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">News outlets</h2>
            <p className="mt-1 text-[13px] text-muted">Everything these publish reaches your Explore feed.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {sources.map((s) => {
                const on = followedSources.has(s.domain);
                return (
                  <button
                    key={s.domain}
                    onClick={() => toggleSource(s.domain)}
                    aria-pressed={on}
                    className={`rounded-full border px-3.5 py-2 text-[13.5px] ${on ? 'border-accent bg-accentSoft font-semibold text-accent' : 'border-rule text-ink'}`}
                  >
                    {s.name}
                  </button>
                );
              })}
            </div>

            {interests.length === 0 && followedSources.size === 0 && (
              <p className="mt-6 text-[13px] text-muted">
                Nothing chosen yet, so Explore is empty. Everything still shows up under News.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Settings sheet */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-end" role="dialog" aria-modal="true" aria-label="Settings">
          <button className="absolute inset-0 bg-ink/50" onClick={() => setSettingsOpen(false)} aria-label="Close" />
          <div className="relative max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-paper px-5 pb-8 pt-3">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule" />
            <h2 className="font-serif text-[20px] font-bold">Settings</h2>

            <NotificationToggle />

            <nav className="mt-6 rule-t pt-4 text-[14.5px]">
              <Link href="/friends" className="block py-2.5">Friends and requests</Link>
              <Link href="/about" className="block py-2.5">About, sources and editorial note</Link>
              <Link href="/privacy" className="block py-2.5">Privacy policy</Link>
              <Link href="/terms" className="block py-2.5">Terms of use</Link>
              <Link href="/admin" className="block py-2.5">Admin</Link>
              {configured && (
                <button onClick={() => signOut()} className="block w-full py-2.5 text-left text-accent">Sign out</button>
              )}
            </nav>

            <AccountSettings />

            {!configured && (
              <p className="mt-5 text-[12px] text-muted">
                Demo account. With Supabase connected, sign-in uses a magic link sent to your email, so there is no password to remember.
              </p>
            )}

            <button onClick={() => setSettingsOpen(false)} className="mt-6 w-full rounded-lg border border-rule py-3 font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
