'use client';

import { useState } from 'react';

export default function ComingSoonForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState('loading');
    setError(null);
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'coming-soon' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Could not join the waitlist right now.');
      setState('done');
    } catch (err: any) {
      setError(err?.message ?? 'Something went wrong. Try again.');
      setState('error');
    }
  };

  if (state === 'done') {
    return (
      <div className="rounded-full border border-ink bg-goldSoft px-6 py-3.5 text-center text-[14px] font-semibold text-ink">
        You&rsquo;re on the list. We&rsquo;ll email you the moment we open.
      </div>
    );
  }

  return (
    <>
      <form onSubmit={submit} className="flex w-full overflow-hidden rounded-full border border-ink">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          aria-label="Your email address"
          className="min-w-0 flex-1 bg-transparent px-5 py-3.5 text-[15px] outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="shrink-0 bg-ink px-6 py-3.5 text-[14px] font-semibold text-gold disabled:opacity-60"
        >
          {state === 'loading' ? 'Joining…' : 'Notify me'}
        </button>
      </form>
      {error && <p className="mt-2.5 text-[12px] text-accent">{error}</p>}
      <p className="mt-3 text-[12px] text-muted">Be first to know when we launch. No spam, ever.</p>
    </>
  );
}
