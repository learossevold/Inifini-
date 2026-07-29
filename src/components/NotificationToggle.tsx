'use client';

import { useEffect, useState } from 'react';
import { PushState, disablePush, enablePush, isSubscribed, pushConfigured, pushState } from '@/lib/push';

/**
 * Opt-in control for the daily morning brief. Open to signed-out readers too —
 * a notification is the cheapest reason to come back, and asking for an account
 * first would defeat that.
 */
export default function NotificationToggle() {
  const [state, setState] = useState<PushState | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setState(pushState());
    isSubscribed().then(setOn);
  }, []);

  if (!pushConfigured() || state === null) return null;

  const toggle = async () => {
    setBusy(true); setErr(null);
    if (on) {
      await disablePush();
      setOn(false);
    } else {
      const { error } = await enablePush();
      if (error) setErr(error); else setOn(true);
      setState(pushState());
    }
    setBusy(false);
  };

  const unavailable = state === 'unsupported' || state === 'needs-install' || state === 'denied';

  return (
    <section className="mt-8 rounded-xl border border-rule bg-white/60 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">Morning brief</h2>
          <p className="mt-1 text-[13px] leading-snug text-muted">
            One notification a day with the story that matters most. Nothing else.
          </p>
        </div>
        {!unavailable && (
          <button
            onClick={toggle}
            disabled={busy}
            role="switch"
            aria-checked={on}
            aria-label="Daily morning brief"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-accent' : 'bg-rule'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-6' : 'left-1'}`} />
          </button>
        )}
      </div>

      {state === 'needs-install' && (
        <p className="mt-3 text-[12.5px] leading-snug text-muted">
          On iPhone, add Inifini to your Home Screen first (Share → Add to Home Screen), then open it from there to turn this on.
        </p>
      )}
      {state === 'denied' && (
        <p className="mt-3 text-[12.5px] leading-snug text-muted">
          Notifications are blocked for this site. Allow them in your browser settings, then come back.
        </p>
      )}
      {state === 'unsupported' && (
        <p className="mt-3 text-[12.5px] leading-snug text-muted">
          This browser doesn&rsquo;t support notifications yet.
        </p>
      )}
      {err && <p className="mt-3 text-[12.5px] text-accent">{err}</p>}
    </section>
  );
}
