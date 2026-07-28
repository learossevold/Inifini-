'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';

export default function SignInScreen() {
  const { signInWithEmail } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email.includes('@')) { setErr('Enter a valid email address.'); return; }
    setLoading(true); setErr(null);
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) setErr(error); else setSent(true);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <p className="font-serif text-[26px] font-bold tracking-tight">Inifini</p>
      <p className="mt-1 text-[14px] text-muted">A calm paper that never runs out.</p>

      {sent ? (
        <div className="mt-12 animate-fadeUp">
          <h1 className="font-serif text-2xl font-bold">Check your email</h1>
          <p className="mt-2 text-[14px] text-muted">
            We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open it on this device to continue.
          </p>
          <button onClick={() => setSent(false)} className="mt-6 text-[13px] text-accent">Use a different email</button>
        </div>
      ) : (
        <div className="mt-12 animate-fadeUp">
          <h1 className="font-serif text-2xl font-bold">Sign in</h1>
          <p className="mt-2 text-[14px] text-muted">No password — we&rsquo;ll email you a magic link.</p>
          <div className="mt-5 flex items-center rounded-lg border border-rule bg-white px-3">
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="you@example.com"
              className="w-full bg-transparent px-2 py-3 outline-none"
            />
          </div>
          {err && <p className="mt-2 text-[13px] text-accent">{err}</p>}
          <button
            onClick={submit}
            disabled={loading || email.trim().length < 3}
            className="mt-6 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper disabled:opacity-40"
          >
            {loading ? 'Sending…' : 'Send magic link'}
          </button>
        </div>
      )}
    </div>
  );
}
