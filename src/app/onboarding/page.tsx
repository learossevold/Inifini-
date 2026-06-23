'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CATEGORIES, Category } from '@/lib/types';
import { useSession } from '@/lib/session';

export default function Onboarding() {
  const router = useRouter();
  const { completeOnboarding } = useSession();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState('');
  const [chosen, setChosen] = useState<Category[]>(['norway', 'world']);

  const toggle = (c: Category) => setChosen((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]);
  const finish = () => { completeOnboarding(username.trim() || 'reader', chosen); router.push('/'); };

  return (
    <div className="min-h-screen px-6 py-12">
      <p className="font-serif text-[26px] font-bold tracking-tight">Inifini</p>
      <p className="mt-1 text-[14px] text-muted">A calm paper that never runs out.</p>

      {step === 0 ? (
        <div className="mt-12 animate-fadeUp">
          <h1 className="font-serif text-2xl font-bold">Pick a username</h1>
          <p className="mt-2 text-[14px] text-muted">This is how friends find you. You can change it later.</p>
          <div className="mt-5 flex items-center rounded-lg border border-rule bg-white px-3">
            <span className="text-muted">@</span>
            <input autoFocus value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
              placeholder="yourname" className="w-full bg-transparent px-2 py-3 outline-none" />
          </div>
          <button onClick={() => setStep(1)} disabled={username.length < 2}
            className="mt-6 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper disabled:opacity-40">Continue</button>
          <p className="mt-4 text-center text-[12px] text-muted">Demo mode — no real email needed. With Supabase connected, this becomes a magic-link login.</p>
        </div>
      ) : (
        <div className="mt-12 animate-fadeUp">
          <h1 className="font-serif text-2xl font-bold">What are you into?</h1>
          <p className="mt-2 text-[14px] text-muted">These fill your <span className="font-medium text-ink">Following</span> feed. Important news always shows in News.</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.id !== 'top').map((c) => {
              const on = chosen.includes(c.id);
              return (
                <button key={c.id} onClick={() => toggle(c.id)}
                  className={`rounded-full border px-4 py-2 text-[14px] ${on ? 'border-accent bg-accentSoft font-semibold text-accent' : 'border-rule text-ink'}`}>
                  {c.label}
                </button>
              );
            })}
          </div>
          <button onClick={finish} disabled={chosen.length === 0}
            className="mt-8 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper disabled:opacity-40">Start reading</button>
          <button onClick={() => setStep(0)} className="mt-3 w-full py-2 text-[14px] text-muted">← Back</button>
        </div>
      )}
    </div>
  );
}
