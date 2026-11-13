import type { Metadata } from 'next';
import { AppShell } from '@/components/saas/shell';
import { requireSaasUser } from '@/lib/saas/auth';

export const metadata: Metadata = { title: { default: 'Customer portal', template: '%s — TopupCraft' }, robots: { index: false } };

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSaasUser();
  const nav = [
    { href: '/portal', label: 'My panels' },
    { href: '/portal/order', label: 'Order new panel' },
    { href: '/portal/invoices', label: 'Invoices' },
    { href: '/portal/account', label: 'Account' },
    ...(user.role === 'admin' ? [{ href: '/admin', label: 'Super admin →' }] : []),
  ];
  return (
    <AppShell user={user} nav={nav} home="/portal">
      {children}
    </AppShell>
  );
}
