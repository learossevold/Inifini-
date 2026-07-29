import type { Metadata, Viewport } from 'next';
import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import { SessionProvider } from '@/lib/session';
import AuthGate from '@/components/AuthGate';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap', axes: ['opsz'] });

export const metadata: Metadata = {
  title: 'Inifini',
  description: 'A calm newspaper that never runs out. AI-assisted news discovery with full credit and links to original publishers.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Inifini' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, themeColor: '#FCFCFD' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="bg-paper text-ink font-sans antialiased">
        <SessionProvider>
          <AuthGate>{children}</AuthGate>
        </SessionProvider>
      </body>
    </html>
  );
}
