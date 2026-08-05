'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Opening screen: the wordmark and what the app is for, held for a beat
 * before the feed appears.
 *
 * It only ever mounts once per real app open. Moving between tabs and pages
 * is client-side navigation, which keeps this layout — and therefore this
 * component — mounted, so the splash cannot reappear mid-session; only a
 * fresh load (launching from the home screen, or opening the URL) starts it
 * again, which is exactly the moment it is meant to mark.
 *
 * aria-hidden, and a tap skips it: a decorative hold is worth a second of a
 * sighted reader's patience, but it should never stand between anyone and
 * the news, and it stops taking pointer events the instant it starts fading.
 */
export default function Splash() {
  const pathname = usePathname();
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const hold = setTimeout(() => setLeaving(true), 1900);
    const remove = setTimeout(() => setGone(true), 2400);
    return () => { clearTimeout(hold); clearTimeout(remove); };
  }, []);

  // The marketing page is its own front door and already says all of this.
  if (gone || pathname === '/coming-soon') return null;

  return (
    <div
      aria-hidden
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-paper px-8 transition-opacity duration-500 ${leaving ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
    >
      {/* The wordmark art is drawn on white. multiply blending drops that
          white into the paper background instead of sitting on it as a
          visible panel, so no transparent cut-out of the logo is needed. */}
      <Image
        src="/wordmark.jpg"
        alt=""
        width={1833}
        height={833}
        priority
        unoptimized
        className="w-[210px] max-w-[62%] mix-blend-multiply"
      />
      <p className="animate-fadeUp mt-7 max-w-[19rem] text-center font-serif text-[16px] leading-relaxed text-ink/70">
        Not built to keep you scrolling.
        <br />
        Built to help you understand the world.
      </p>
    </div>
  );
}
