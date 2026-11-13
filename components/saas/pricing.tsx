import Link from 'next/link';
import { formatMoney, planFeatures } from '@/lib/saas/plans';

type Plan = {
  id: number;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  currency: string;
  features: unknown;
  isPopular: boolean;
};

export function PricingGrid({ plans, loggedIn }: { plans: Plan[]; loggedIn: boolean }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`relative flex flex-col rounded-2xl border bg-white p-7 ${
            plan.isPopular ? 'border-emerald-500 shadow-xl shadow-emerald-600/10 ring-1 ring-emerald-500' : 'border-slate-200 shadow-sm'
          }`}
        >
          {plan.isPopular && (
            <span className="absolute -top-3 left-7 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
              Most popular
            </span>
          )}
          <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
          <p className="mt-1 min-h-[40px] text-sm text-slate-500">{plan.description}</p>
          <p className="mt-5 flex items-baseline gap-1">
            <span className="text-4xl font-extrabold tracking-tight text-slate-900">
              {formatMoney(plan.priceMonthly, plan.currency)}
            </span>
            <span className="text-sm font-medium text-slate-500">/month</span>
          </p>
          <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-700">
            {planFeatures(plan).map((feature) => (
              <li key={feature} className="flex gap-3">
                <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 flex-none text-emerald-600" fill="currentColor" aria-hidden="true">
                  <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0z" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <Link
            href={loggedIn ? `/portal/order?plan=${plan.slug}` : `/register?plan=${plan.slug}`}
            className={`mt-8 ${plan.isPopular ? 'tc-btn-primary' : 'tc-btn-dark'} w-full`}
          >
            Order {plan.name}
          </Link>
        </div>
      ))}
    </div>
  );
}
