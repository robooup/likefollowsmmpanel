'use client';

import { useActionState, useEffect, useState } from 'react';
import { createOrderAction } from '@/lib/saas/actions';

type Plan = { id: number; slug: string; name: string; priceMonthly: number; currency: string; description: string; isPopular: boolean };

const PERIODS = [1, 3, 6, 12];

function money(amount: number, currency: string) {
  return `${currency === 'BDT' ? '৳' : currency + ' '}${amount.toLocaleString('en-US')}`;
}

export function OrderForm({ plans, rootDomain, initialPlan }: { plans: Plan[]; rootDomain: string; initialPlan?: string }) {
  const [state, formAction, pending] = useActionState(createOrderAction, null);
  const [planId, setPlanId] = useState(
    (plans.find((p) => p.slug === initialPlan) || plans.find((p) => p.isPopular) || plans[0])?.id
  );
  const [months, setMonths] = useState(1);
  const [subdomain, setSubdomain] = useState('');
  const [check, setCheck] = useState<{ ok: boolean; message: string } | null>(null);

  const plan = plans.find((p) => p.id === planId);

  useEffect(() => {
    const name = subdomain.trim().toLowerCase();
    if (name.length < 3) {
      setCheck(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/saas/subdomain-check?name=${encodeURIComponent(name)}`, { signal: controller.signal });
        const data = await response.json();
        setCheck({ ok: !!data.available, message: data.message || '' });
      } catch {
        /* aborted or offline: the server validates again on submit */
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [subdomain]);

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="tc-card p-5">
          <h2 className="text-base font-semibold text-slate-900">1. Choose a plan</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {plans.map((p) => (
              <label
                key={p.id}
                className={`cursor-pointer rounded-xl border p-4 transition ${
                  planId === p.id ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="planId" value={p.id} checked={planId === p.id} onChange={() => setPlanId(p.id)} className="sr-only" />
                <span className="block text-sm font-semibold text-slate-900">{p.name}</span>
                <span className="mt-1 block text-lg font-bold text-slate-900">
                  {money(p.priceMonthly, p.currency)}
                  <span className="text-xs font-medium text-slate-500"> /mo</span>
                </span>
              </label>
            ))}
          </div>
          <h3 className="mt-6 text-sm font-medium text-slate-700">Billing period</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {PERIODS.map((value) => (
              <label
                key={value}
                className={`cursor-pointer rounded-lg border px-4 py-2 text-sm font-medium ${
                  months === value ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <input type="radio" name="months" value={value} checked={months === value} onChange={() => setMonths(value)} className="sr-only" />
                {value} month{value > 1 ? 's' : ''}
              </label>
            ))}
          </div>
        </section>

        <section className="tc-card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">2. Name your panel</h2>
          <div>
            <label htmlFor="name" className="tc-label">Panel name</label>
            <input id="name" name="name" className="tc-input" placeholder="e.g. Rocket SMM" required minLength={2} maxLength={60} />
            <p className="mt-1 text-xs text-slate-500">Shown as your site title. You can change it later in your panel settings.</p>
          </div>
          <div>
            <label htmlFor="subdomain" className="tc-label">Free subdomain</label>
            <div className="flex">
              <input
                id="subdomain"
                name="subdomain"
                className="tc-input rounded-r-none"
                placeholder="rocketsmm"
                required
                minLength={3}
                maxLength={32}
                pattern="[a-zA-Z0-9\-]+"
                autoCapitalize="none"
                value={subdomain}
                onChange={(event) => setSubdomain(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              />
              <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-600">
                .{rootDomain}
              </span>
            </div>
            <p className={`mt-1 text-xs ${check ? (check.ok ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-500'}`}>
              {check ? check.message : 'Your panel goes live here immediately. Add your own domain any time after ordering.'}
            </p>
          </div>
        </section>

        <section className="tc-card space-y-4 p-5">
          <h2 className="text-base font-semibold text-slate-900">3. Create your panel admin login</h2>
          <p className="text-sm text-slate-500">You will use this to sign in to your new panel’s admin area.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="adminUsername" className="tc-label">Admin username</label>
              <input id="adminUsername" name="adminUsername" className="tc-input" required minLength={4} maxLength={30} pattern="[a-zA-Z0-9_]+" autoComplete="off" autoCapitalize="none" />
            </div>
            <div>
              <label htmlFor="adminPassword" className="tc-label">Admin password</label>
              <input id="adminPassword" name="adminPassword" type="password" className="tc-input" required minLength={8} autoComplete="new-password" />
            </div>
          </div>
        </section>
      </div>

      <aside className="tc-card h-fit p-5 lg:sticky lg:top-6">
        <h2 className="text-base font-semibold text-slate-900">Order summary</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Plan</dt>
            <dd className="font-medium text-slate-900">{plan?.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Period</dt>
            <dd className="font-medium text-slate-900">{months} month{months > 1 ? 's' : ''}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Setup fee</dt>
            <dd className="font-medium text-emerald-700">Free</dd>
          </div>
          <div className="flex justify-between border-t border-slate-100 pt-3 text-base">
            <dt className="font-semibold text-slate-900">Total</dt>
            <dd className="font-bold text-slate-900">{plan ? money(plan.priceMonthly * months, plan.currency) : '—'}</dd>
          </div>
        </dl>
        {state?.error && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>
        )}
        <button type="submit" disabled={pending || !plan} className="tc-btn-primary mt-5 w-full">
          {pending ? 'Creating order…' : 'Continue to payment'}
        </button>
        <p className="mt-3 text-xs leading-5 text-slate-500">Your panel is created automatically as soon as the payment is confirmed.</p>
      </aside>
    </form>
  );
}
