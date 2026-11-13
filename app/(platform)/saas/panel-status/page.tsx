import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Site unavailable', robots: { index: false } };

const MESSAGES: Record<string, { title: string; text: string }> = {
  unknown: {
    title: 'No site here yet',
    text: 'This domain is pointed at our platform, but it is not connected to a panel. If this is your domain, add and verify it from your customer portal.',
  },
  expired: {
    title: 'This site is temporarily offline',
    text: 'The subscription for this panel has ended. If you are the owner, renew it from your customer portal to bring it back online.',
  },
  suspended: {
    title: 'This site is suspended',
    text: 'This panel has been suspended. If you are the owner, please contact support.',
  },
};

// Shown on a customer's domain when its panel cannot be served.
export default async function PanelStatusPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const message = MESSAGES[state || ''] || {
    title: 'This site is not available right now',
    text: 'Please check back shortly.',
  };
  return (
    <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-center text-white">
      <div className="max-w-md">
        <div className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 8v5m0 3h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold">{message.title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message.text}</p>
      </div>
    </main>
  );
}
