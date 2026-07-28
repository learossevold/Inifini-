'use client';

import { useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import BottomNav from './BottomNav';
import SignInScreen from './SignInScreen';

/**
 * Gates the app on real auth state when Supabase is configured:
 * loading → sign-in (magic link) → onboarding (username/interests) → app.
 * In zero-key demo mode this is a pass-through — no gate at all.
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

  if (!configured) {
    return (
      <>
        <div className="mx-auto min-h-screen max-w-md pb-16">{children}</div>
        <BottomNav />
      </>
    );
  }

  if (status === 'loading') {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading Inifini…</div>;
  }

  if (status === 'signed-out') {
    return <SignInScreen />;
  }

  if (status === 'needs-onboarding' && pathname !== '/onboarding') {
    return <div className="flex min-h-screen items-center justify-center text-muted">Loading Inifini…</div>;
  }

  return (
    <>
      <div className="mx-auto min-h-screen max-w-md pb-16">{children}</div>
      <BottomNav />
    </>
  );
}
