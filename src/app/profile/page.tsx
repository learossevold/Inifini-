'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CATEGORIES, Category } from '@/lib/types';
import { useSession } from '@/lib/session';
import { MOCK_STORIES } from '@/lib/mock-data';
import { Avatar, categoryLabel, timeAgo } from '@/components/ui';

export default function ProfilePage() {
  const { me, interests, setInterests, saves, friends } = useSession();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Category[]>(interests);

  const toggle = (c: Category) => setDraft((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const save = () => { setInterests(draft); setEditing(false); };
  const savedStories = MOCK_STORIES.filter((s) => saves.has(s.id));

  return (
    <main className="px-5 py-6">
      <header className="flex items-center gap-4">
        <Avatar name={me?.display_name || me?.username || 'You'} size={64} />
        <div>
          <h1 className="font-serif text-2xl font-bold leading-tight">{me?.display_name || me?.username}</h1>
          <p className="text-[14px] text-muted">@{me?.username}</p>
        </div>
      </header>
      {me?.bio && <p className="mt-3 font-serif text-[16px] text-ink/85">{me.bio}</p>}

      {/* No public follower counts — private friend count only */}
      <p className="mt-3 text-[13px] text-muted">{friends.length} friends · {saves.size} saved</p>

      {/* Interests */}
      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Your interests</h2>
          {!editing ? <button onClick={() => { setDraft(interests); setEditing(true); }} className="text-[13px] text-accent">Edit</button>
            : <button onClick={save} className="text-[13px] font-semibold text-accent">Done</button>}
        </div>
        {!editing ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {interests.length === 0 && <p className="text-[14px] text-muted">No interests yet.</p>}
            {interests.map((c) => <span key={c} className="rounded-full bg-accentSoft px-3 py-1.5 text-[13px] font-medium text-accent">{categoryLabel(c)}</span>)}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.id !== 'top').map((c) => {
              const on = draft.includes(c.id);
              return <button key={c.id} onClick={() => toggle(c.id)} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${on ? 'border-accent bg-accentSoft font-semibold text-accent' : 'border-rule'}`}>{c.label}</button>;
            })}
          </div>
        )}
      </section>

      {/* Saved */}
      <section className="mt-8">
        <h2 className="font-sans text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Saved stories</h2>
        {savedStories.length === 0 ? (
          <p className="mt-3 text-[14px] text-muted">Tap the bookmark on any story to save it here.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {savedStories.map((s) => (
              <li key={s.id}><Link href="/" className="block"><p className="font-serif text-[16px] font-semibold leading-snug">{s.title}</p><p className="mt-0.5 text-[12px] text-muted">{s.source_name} · {timeAgo(s.published_at)}</p></Link></li>
            ))}
          </ul>
        )}
      </section>

      {/* Settings */}
      <section className="mt-8 rule-t pt-5 text-[14px]">
        <Link href="/friends" className="block py-2.5">Friends &amp; requests</Link>
        <Link href="/about" className="block py-2.5">About, sources &amp; editorial note</Link>
        <Link href="/admin" className="block py-2.5">Admin</Link>
        <p className="mt-4 text-[12px] text-muted">Demo account. With Supabase connected, sign-in uses a magic link sent to your email — no password to remember.</p>
      </section>
    </main>
  );
}
