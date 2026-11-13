'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import * as FaIcons from 'react-icons/fa';
import { FaBars, FaChevronDown, FaTimes } from 'react-icons/fa';
import { userNavItems } from '@/data/sidebar-nav/user-nav-items';
import { useGetUserStatsQuery } from '@/lib/services/dashboard-api';
import { PriceDisplay } from '@/components/price-display';
import { AppName } from '@/components/app-name';
import { useModuleFlags, type ModuleFlags } from './use-module-flags';

// Sidebar entries, in order. Titles refer to data/sidebar-nav/user-nav-items.
const NAV: { title: string; label: string; needs?: keyof ModuleFlags }[] = [
  { title: 'New Order', label: 'New order' },
  { title: 'All Services', label: 'Services' },
  { title: 'My Orders', label: 'Orders' },
  { title: 'Add Funds', label: 'Add funds' },
  { title: 'Transactions', label: 'Transactions' },
  { title: 'Support Tickets', label: 'Tickets', needs: 'tickets' },
  { title: 'API Integration', label: 'API' },
  { title: 'Affiliate Program', label: 'Affiliates', needs: 'affiliate' },
  { title: 'Child Panel', label: 'Child panel', needs: 'childPanel' },
  { title: 'Mass Orders', label: 'Mass order', needs: 'massOrder' },
  { title: 'Service Updates', label: 'Service updates', needs: 'serviceUpdates' },
  { title: 'Contact Support', label: 'Contact', needs: 'contact' },
  { title: 'FAQs', label: 'FAQs' },
  { title: 'Terms', label: 'Terms' },
];

async function logout() {
  try {
    const { signOut } = await import('next-auth/react');
    await signOut({ callbackUrl: '/', redirect: true });
  } catch {
    window.location.href = '/';
  }
}

export default function CarbonShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const flags = useModuleFlags();
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: stats } = useGetUserStatsQuery(undefined);
  const balance = Number(stats?.data?.balance || 0);

  useEffect(() => setMenuOpen(false), [pathname]);

  const items = useMemo(() => {
    const byTitle = new Map(userNavItems.map((item: any) => [item.title, item]));
    return NAV.filter((entry) => !entry.needs || flags[entry.needs])
      .map((entry) => {
        const item: any = byTitle.get(entry.title);
        if (!item) return null;
        const Icon = (FaIcons as any)[item.icon] || FaIcons.FaCircle;
        return { href: item.href as string, label: entry.label, Icon };
      })
      .filter(Boolean) as { href: string; label: string; Icon: React.ComponentType<{ className?: string }> }[];
  }, [flags]);

  // The longest matching href wins, so /services/updates does not also light up /services.
  const activeHref = useMemo(() => {
    const matches = items.filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
    return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href || (pathname === '/dashboard' ? '/new-order' : '');
  }, [items, pathname]);

  const nav = (
    <nav className="cb-nav">
      {items.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={`cb-nav-item ${activeHref === href ? 'is-active' : ''}`}>
          <Icon className="cb-nav-icon" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div id="cb-app" className="cb-app">
      <header className="cb-topbar">
        <button type="button" className="cb-burger" aria-label="Menu" onClick={() => setMenuOpen((open) => !open)}>
          {menuOpen ? <FaTimes /> : <FaBars />}
        </button>
        <Link href="/new-order" className="cb-brand">
          <AppName />
        </Link>
        <div className="cb-topbar-right">
          <Link href="/add-funds" className="cb-balance" title="Add funds">
            <PriceDisplay amount={balance} originalCurrency="USD" className="cb-balance-amount" />
            <FaChevronDown className="cb-balance-caret" />
          </Link>
          <Link href="/account-settings" className="cb-toplink">
            Account
          </Link>
          <button type="button" className="cb-toplink" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <aside className="cb-sidebar">{nav}</aside>

      {menuOpen && (
        <div className="cb-drawer" onClick={() => setMenuOpen(false)}>
          <div className="cb-drawer-panel" onClick={(event) => event.stopPropagation()}>
            {nav}
          </div>
        </div>
      )}

      <main className="cb-main">
        <div key={pathname} className="cb-content">{children}</div>
      </main>
    </div>
  );
}
