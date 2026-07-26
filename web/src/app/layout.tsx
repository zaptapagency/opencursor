import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { env } from '@/lib/env';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: 'opencursor Cloud — accounts, licensing & billing',
    template: '%s · opencursor Cloud',
  },
  description:
    'The companion platform for the opencursor VS Code extension. Manage your account, activate a license, and upgrade to Pro.',
  openGraph: {
    title: 'opencursor Cloud',
    description:
      'Accounts, licensing, and billing for the opencursor VS Code extension.',
    url: env.NEXT_PUBLIC_APP_URL,
    siteName: 'opencursor Cloud',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
