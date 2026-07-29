'use client';

import { useState } from 'react';
import { useSession } from '@/lib/session';

/**
 * Shown the moment a signed-out reader tries something that needs an identity.
 * Reading stays open; this only appears on intent, never on arrival.
 */
export default function SignInPrompt() {
  const { signInPrompt, dismissSignInPrompt, signInWithEmail } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!signInPrompt) return null;

  const close = () => { setSent(false); setEmail(''); setErr(null); dismissSignInPrompt(); };

  const submit = async () => {
    if (!email.includes('@')) { setErr('Enter a valid email address.'); return; }
    setLoading(true); setErr(null);
    const { error } = await signInWithEmail(email.trim());
    setLoading(false);
    if (error) setErr(error); else setSent(true);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true" aria-label="Sign in">
      <button className="absolute inset-0 bg-ink/50" onClick={close} aria-label="Close" />
      <div className="relative w-full rounded-t-2xl bg-paper px-5 pb-9 pt-3 animate-fadeUp">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-rule" />

        {sent ? (
          <>
            <h2 className="font-serif text-[22px] font-bold">Check your email</h2>
            <p className="mt-2 text-[14px] text-muted">
              We sent a sign-in link to <span className="font-medium text-ink">{email}</span>. Open it on this device and you&rsquo;ll pick up right where you left off.
            </p>
            <button onClick={close} className="mt-6 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper">Done</button>
          </>
        ) : (
          <>
            <h2 className="font-serif text-[22px] font-bold leading-snug">{signInPrompt}</h2>
            <p className="mt-2 text-[14px] text-muted">No password needed. We&rsquo;ll email you a magic link, and you can keep reading either way.</p>

            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
              placeholder="you@example.com"
              aria-label="Email address"
              className="mt-4 w-full rounded-lg border border-rule bg-white px-4 py-3 outline-none focus:border-accent"
            />
            {err && <p className="mt-2 text-[13px] text-accent">{err}</p>}

            <button
              onClick={submit}
              disabled={loading || email.trim().length < 3}
              className="mt-4 w-full rounded-lg bg-ink py-3.5 font-semibold text-paper disabled:opacity-40"
            >
              {loading ? 'Sending…' : 'Send magic link'}
            </button>
            <button onClick={close} className="mt-2 w-full py-2.5 text-[14px] font-medium text-muted">Not now</button>
          </>
        )}
      </div>
    </div>
  );
}
