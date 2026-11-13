import type { Metadata } from 'next';
import { AppShell } from '@/components/saas/shell';
import { requireSaasAdmin } from '@/lib/saas/auth';

export const metadata: Metadata = { title: { default: 'Super admin', template: '%s — TopupCraft admin' }, robots: { index: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSaasAdmin();
  return (
    <AppShell
      user={user}
      home="/admin"
      badge="Admin"
      nav={[
        { href: '/admin', label: 'Overview' },
        { href: '/admin/panels', label: 'Panels' },
        { href: '/admin/customers', label: 'Customers' },
        { href: '/admin/invoices', label: 'Invoices' },
        { href: '/admin/plans', label: 'Plans' },
        { href: '/admin/settings', label: 'Settings' },
        { href: '/portal', label: 'Customer view →' },
      ]}
    >
      {children}
    </AppShell>
  );
}
