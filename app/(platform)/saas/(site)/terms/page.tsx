import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of service' };

const SECTIONS: [string, string][] = [
  ['The service', 'TopupCraft provides hosted SMM panel software. You rent a panel for a paid period and operate it as your own business. We do not supply the social media services sold through your panel.'],
  ['Your account', 'You are responsible for keeping your login details safe and for everything done through your account and your panel, including the actions of your staff and customers.'],
  ['Payments and renewal', 'Plans are paid in advance for the period you choose. If a panel is not renewed by its due date it may be taken offline after a short grace period. Renewing restores it.'],
  ['Acceptable use', 'You may not use a panel for anything illegal, to send spam, to distribute malware, to defraud people or to attack other systems. We may suspend a panel that puts the platform or other customers at risk.'],
  ['Your data', 'The customers, orders and settings in your panel belong to you. We store them in a database dedicated to your panel and do not sell or share them.'],
  ['Availability', 'We work to keep the platform online and backed up, but the service is provided as is, without a guarantee of uninterrupted availability.'],
  ['Changes', 'We may update these terms as the service evolves. Continued use after a change means you accept the updated terms.'],
];

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Terms of service</h1>
      <p className="mt-3 text-sm text-slate-500">Please review these terms with your own legal adviser before relying on them.</p>
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
