import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy policy' };

const SECTIONS: [string, string][] = [
  ['What we collect', 'Your name, email address and password (stored only as a secure hash) when you register, plus the details of your orders and payments with us.'],
  ['Payments', 'Payments are processed by our payment gateway. We receive a confirmation and reference for each payment, not your wallet or card credentials.'],
  ['Your panel’s data', 'Data inside your panel (your customers, their orders, your provider keys) is stored in a database used only by your panel. You control it; we access it only to operate, secure and support the service.'],
  ['Cookies', 'We use a single essential cookie to keep you logged in. We do not use advertising cookies.'],
  ['Retention', 'Account and billing records are kept while your account is active and as required for accounting. Panel data is deleted after a panel is terminated and its data removed.'],
  ['Contact', 'For any privacy request, contact us through the support channel shown in your customer portal.'],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Privacy policy</h1>
      <div className="mt-10 space-y-8">
        {SECTIONS.map(([title, text], index) => (
          <section key={title}>
            <h2 className="text-xl font-semibold text-slate-900">{index + 1}. {title}</h2>
            <p className="mt-2 leading-7 text-slate-600">{text}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
