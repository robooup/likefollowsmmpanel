import Link from 'next/link';
import { PricingGrid } from '@/components/saas/pricing';
import { getSaasUser } from '@/lib/saas/auth';
import { listActivePlans } from '@/lib/saas/plans';
import { platformRootDomain } from '@/lib/tenant/config';

const FEATURES = [
  {
    title: 'Live in minutes',
    text: 'Pay, and your panel is created automatically — database, admin account and SSL included. No server work.',
    icon: 'M13 2 4 14h7l-1 8 9-12h-7z',
  },
  {
    title: 'Your domain, your brand',
    text: 'Start on a free subdomain, connect your own domain whenever you like and switch between them any time.',
    icon: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0c2.5 2.6 3.8 5.6 3.8 9S14.5 18.4 12 21m0-18C9.5 5.6 8.2 8.6 8.2 12s1.3 6.4 3.8 9M3.5 9h17M3.5 15h17',
  },
  {
    title: 'Connect any provider',
    text: 'Add provider APIs, import their services in bulk, set your markup and let orders forward automatically.',
    icon: 'M8 7h8M8 12h8M8 17h5M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
  },
  {
    title: 'Get paid your way',
    text: 'Plug in your own payment gateway. Customer deposits land in your account, not ours.',
    icon: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 3h18M7 15h3',
  },
  {
    title: 'Built for resellers',
    text: 'Customer API, mass orders, refills, cancels, affiliates and tickets — the tools your buyers already expect.',
    icon: 'M17 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.9M14 4.1a4 4 0 0 1 0 7.8M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  },
  {
    title: 'Isolated and backed up',
    text: 'Every panel runs on its own private database. Your customers and orders are never mixed with anyone else’s.',
    icon: 'M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6zm-3 9 2 2 4-4',
  },
];

const STEPS = [
  { title: 'Pick a plan', text: 'Choose a plan and a name for your panel. Create your TopupCraft account in a few seconds.' },
  { title: 'Pay online', text: 'Complete the payment. Your panel is built automatically the moment it is confirmed.' },
  { title: 'Start selling', text: 'Log in to your admin, add providers and services, connect your payment gateway and go live.' },
];

const FAQ = [
  {
    q: 'How fast will my panel be ready?',
    a: 'Normally under a minute after your payment is confirmed. You will see it in your customer portal with the login link.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Yes. Every panel gets a free subdomain straight away. Add your own domain from the portal, point its DNS record to us, and SSL is issued automatically.',
  },
  {
    q: 'Can I change the domain later?',
    a: 'Any time. Add the new domain, verify it, and set it as primary. The old one can stay connected or be removed.',
  },
  {
    q: 'Who receives my customers’ payments?',
    a: 'You do. You connect your own payment gateway inside your panel, so deposits go directly to your account.',
  },
  {
    q: 'What happens if I do not renew?',
    a: 'We remind you in the portal before the due date. After a short grace period the panel goes offline, and comes back as soon as you renew. Your data is kept.',
  },
  {
    q: 'Do you provide the SMM services?',
    a: 'No. TopupCraft is the software and hosting. You connect the service providers you want to resell and set your own prices.',
  },
];

export default async function LandingPage() {
  const [plans, user] = await Promise.all([listActivePlans(), getSaasUser()]);
  const root = platformRootDomain();
  return (
    <>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="tc-grid-bg absolute inset-0 opacity-60" aria-hidden="true" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Hosted SMM panel platform
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Your own SMM panel,{' '}
              <span className="bg-gradient-to-r from-emerald-300 to-amber-200 bg-clip-text text-transparent">ready in minutes</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
              Order a panel, get it live on your own domain and start reselling social media services under your brand.
              We run the servers, security and updates — you run the business.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={user ? '/portal/order' : '/register'} className="tc-btn bg-emerald-500 px-6 py-3 text-base text-slate-950 hover:bg-emerald-400">
                Launch my panel
              </Link>
              <Link href="/pricing" className="tc-btn border border-white/20 px-6 py-3 text-base text-white hover:bg-white/10">
                See pricing
              </Link>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 text-sm">
              {[
                ['< 1 min', 'Setup time'],
                ['Free', 'SSL certificate'],
                ['Any time', 'Change domain'],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-slate-400">{label}</dt>
                  <dd className="mt-1 text-xl font-bold text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative" aria-hidden="true">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-2 shadow-2xl shadow-emerald-500/10 backdrop-blur">
              <div className="flex items-center gap-1.5 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-3 flex-1 truncate rounded-md bg-white/5 px-3 py-1 text-xs text-slate-400">
                  https://yourbrand.{root}/admin
                </span>
              </div>
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-slate-900">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ['Orders today', '1,284'],
                    ['Revenue', '৳48,920'],
                    ['Customers', '3,107'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-[11px] font-medium text-slate-500">{label}</p>
                      <p className="mt-1 text-lg font-bold">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold">Orders this week</p>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">+18%</span>
                  </div>
                  <div className="flex h-24 items-end gap-2">
                    {[38, 52, 44, 67, 58, 81, 96].map((height, index) => (
                      <div key={index} className="flex-1 rounded-t bg-gradient-to-t from-emerald-600 to-emerald-400" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  {[
                    ['Instagram Followers', 'Completed', 'bg-emerald-50 text-emerald-700'],
                    ['YouTube Views', 'In progress', 'bg-sky-50 text-sky-700'],
                    ['Facebook Page Likes', 'Pending', 'bg-amber-50 text-amber-700'],
                  ].map(([service, status, tone]) => (
                    <div key={service} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                      <span className="font-medium">{service}</span>
                      <span className={`rounded-full px-2 py-0.5 font-semibold ${tone}`}>{status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Features</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything a reseller panel needs</h2>
          <p className="mt-4 text-slate-600">One subscription covers the software, hosting, SSL and updates.</p>
        </div>
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-slate-200 p-6 transition hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-600/5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={feature.icon} />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">How it works</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Three steps to your first order</h2>
          </div>
          <ol className="mt-14 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="tc-card p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-900 text-sm font-bold text-white">{index + 1}</span>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Pricing</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Simple monthly plans</h2>
          <p className="mt-4 text-slate-600">Fixed price, no setup fee. Upgrade or renew from your portal whenever you want.</p>
        </div>
        <div className="mt-14">
          <PricingGrid plans={plans} loggedIn={!!user} />
        </div>
      </section>

      <section id="faq" className="scroll-mt-20 bg-slate-50 py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Questions, answered</h2>
          <div className="mt-10 space-y-3">
            {FAQ.map((item) => (
              <details key={item.q} className="tc-card group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {item.q}
                  <span className="text-xl leading-none text-emerald-600 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-emerald-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to open your own panel?</h2>
          <p className="max-w-xl text-emerald-50">Create your account, pick a plan and be online before your coffee gets cold.</p>
          <Link href={user ? '/portal/order' : '/register'} className="tc-btn bg-white px-6 py-3 text-base text-emerald-700 hover:bg-emerald-50">
            Get started now
          </Link>
        </div>
      </section>
    </>
  );
}
