import './platform.css';
import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { baseUrlSync } from '@/lib/tenant/url';

const font = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap' });

export const dynamic = 'force-dynamic';

export function generateMetadata(): Metadata {
  return {
    metadataBase: new URL(baseUrlSync() || 'http://localhost'),
    title: { default: 'TopupCraft — Launch your own SMM panel in minutes', template: '%s — TopupCraft' },
    description:
      'TopupCraft gives you a fully hosted SMM panel on your own domain: services, providers, payments, customers and an API, ready the moment you order.',
    icons: { icon: '/saas-icon.svg' },
  };
}

export default function PlatformRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={font.className}>{children}</body>
    </html>
  );
}
