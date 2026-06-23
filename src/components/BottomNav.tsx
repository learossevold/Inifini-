'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/session';

function Icon({ name, active }: { name: string; active: boolean }) {
  const s = 24, sw = active ? 2.1 : 1.7;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'home': return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>;
    case 'friends': return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'bell': return <svg {...common}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>;
    case 'profile': return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>;
    default: return null;
  }
}

const ITEMS = [
  { href: '/', icon: 'home', label: 'Home' },
  { href: '/search', icon: 'search', label: 'Search' },
  { href: '/friends', icon: 'friends', label: 'Friends' },
  { href: '/notifications', icon: 'bell', label: 'Alerts' },
  { href: '/profile', icon: 'profile', label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { unreadCount } = useSession();
  if (pathname === '/onboarding') return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-md border-t border-rule bg-paper/95 backdrop-blur-sm">
      <ul className="flex items-stretch justify-around">
        {ITEMS.map((it) => {
          const active = it.href === '/' ? pathname === '/' : pathname.startsWith(it.href);
          const showBadge = it.icon === 'bell' && unreadCount > 0;
          return (
            <li key={it.href} className="flex-1">
              <Link href={it.href} className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${active ? 'text-accent' : 'text-muted'}`}>
                <span className="relative">
                  <Icon name={it.icon} active={active} />
                  {showBadge && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-paper">
                      {unreadCount}
                    </span>
                  )}
                </span>
                <span className={active ? 'font-semibold' : ''}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
