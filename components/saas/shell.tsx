import Link from 'next/link';
import { logoutAction } from '@/lib/saas/actions';
import { Logo } from './ui';

export function AppShell({
  user,
  nav,
  home,
  badge,
  children,
}: {
  user: { name: string; email: string };
  nav: { href: string; label: string }[];
  home: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo href={home} />
            {badge && (
              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">{badge}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight text-slate-900">{user.name}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button type="submit" className="tc-btn-ghost px-3 py-2">Log out</button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6" aria-label="Sections">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-slate-600 hover:border-emerald-500 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
