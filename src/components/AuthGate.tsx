'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import BottomNav from './BottomNav';
import SignInPrompt from './SignInPrompt';

/**
 * Reading is open to everyone — no sign-in wall. Signed-out visitors browse
 * freely; the sign-in prompt appears only when they reach for something that
 * needs an identity (see SessionProvider's `blocked`).
 *
 * The one redirect left: a signed-in user who hasn't picked a username and
 * interests yet is sent through onboarding once.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { configured, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (configured && status === 'needs-onboarding' && pathname !== '/onboarding') {
      router.replace('/onboarding');
    }
  }, [configured, status, pathname, router]);

  if (configured && status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading Inifini…</div>;
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-md pb-16">{children}</div>
      <BottomNav />
      <SignInPrompt />
    </>
  );
}
