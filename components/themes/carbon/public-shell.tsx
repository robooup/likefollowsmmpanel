'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { FaBars, FaTimes } from 'react-icons/fa';
import { AppName } from '@/components/app-name';

const LINKS = [
  { href: '/sign-in', label: 'Sign in' },
  { href: '/our-services', label: 'Services' },
  { href: '/blogs', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

/** Header and footer of the Carbon theme for visitors who are not signed in. */
export default function CarbonPublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const links = (
    <>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className={`cb-toplink ${pathname === link.href ? 'is-active' : ''}`}>
          {link.label}
        </Link>
      ))}
      <Link href="/sign-up" className="cb-btn cb-btn-small">
        Sign up
      </Link>
    </>
  );

  return (
    <div id="cb-app" className="cb-app cb-public">
      <header className="cb-topbar">
        <Link href="/" className="cb-brand">
          <AppName />
        </Link>
        <nav className="cb-topbar-right cb-public-nav">{links}</nav>
        <button type="button" className="cb-burger cb-public-burger" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
          {open ? <FaTimes /> : <FaBars />}
        </button>
      </header>

      {open && (
        <div className="cb-drawer" onClick={() => setOpen(false)}>
          <div className="cb-drawer-panel cb-public-drawer" onClick={(event) => event.stopPropagation()}>
            {links}
          </div>
        </div>
      )}

      <main className="cb-public-main">
        <div key={pathname} className="cb-content cb-public-content">
          {children}
        </div>
      </main>

      <footer className="cb-footer">
        © {new Date().getFullYear()} <AppName />. All rights reserved.
      </footer>
    </div>
  );
}
