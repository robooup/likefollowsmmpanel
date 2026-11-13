import Link from 'next/link';
import { Logo } from '@/components/saas/ui';
import { getSaasUser } from '@/lib/saas/auth';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const user = await getSaasUser();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <Link href="/#features" className="hover:text-slate-900">Features</Link>
            <Link href="/#how" className="hover:text-slate-900">How it works</Link>
            <Link href="/pricing" className="hover:text-slate-900">Pricing</Link>
            <Link href="/#faq" className="hover:text-slate-900">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <Link href={user.role === 'admin' ? '/admin' : '/portal'} className="tc-btn-primary">
                My account
              </Link>
            ) : (
              <>
                <Link href="/login" className="tc-btn hidden text-slate-700 hover:bg-slate-100 sm:inline-flex">
                  Log in
                </Link>
                <Link href="/register" className="tc-btn-primary">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-400">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo light />
            <p className="mt-4 max-w-sm text-sm leading-6">
              Hosted SMM panels for resellers. Order today, start selling today — on your own domain, with your own
              brand.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Product</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/#features" className="hover:text-white">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/register" className="hover:text-white">Order a panel</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Company</h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link href="/terms" className="hover:text-white">Terms of service</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Privacy policy</Link></li>
              <li><Link href="/login" className="hover:text-white">Customer login</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs">
          © {new Date().getFullYear()} TopupCraft. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
