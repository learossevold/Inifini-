import type { Metadata, Viewport } from 'next';
import { Inter, Source_Serif_4 } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/lib/session';
import AuthGate from '@/components/AuthGate';
import Splash from '@/components/Splash';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
// italic is only downloaded by the browser on the pages that actually render
// it (the coming-soon headline's swash "right now."), so this costs nothing
// on every other page.
//
// Was Fraunces — moody, soft-terminal display serif — until its rounded,
// idiosyncratic letterforms (baked into the typeface, not fixable by axis
// tuning: SOFT/WONK already sit at their calmest 0 default, opsz was already
// pinned to its cleanest "display" cut) read as uneven rather than as
// character once headlines got big enough to look at closely. Source Serif 4
// is a straight-edged editorial serif built for exactly this — reading UI —
// with none of that softness.
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap', axes: ['opsz'], style: ['normal', 'italic'] });

export const metadata: Metadata = {
  title: 'Inifini',
  description: 'A calm newspaper that never runs out. AI-assisted news discovery with full credit and links to original publishers.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Inifini' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#FCFCFD' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <Splash />
        <SessionProvider>
          <AuthGate>{children}</AuthGate>
        </SessionProvider>
      </body>
    </html>
  );
}
