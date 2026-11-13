import Link from 'next/link';

export function Logo({ href = '/', light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="TopupCraft home">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#059669" />
        <path d="M8 10h16v4h-6v10h-4V14H8z" fill="#fff" />
        <circle cx="23.5" cy="22.5" r="2.5" fill="#fcd34d" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${light ? 'text-white' : 'text-slate-900'}`}>
        Topup<span className="text-emerald-500">Craft</span>
      </span>
    </Link>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  pending_payment: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  unpaid: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  provisioning: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  suspended: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  expired: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  failed: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  blocked: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  terminated: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-500/20',
};

const STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting payment',
  provisioning: 'Setting up',
};

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
        STATUS_STYLES[status] || 'bg-slate-100 text-slate-600 ring-slate-500/20'
      }`}
    >
      {label}
    </span>
  );
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`tc-card ${className}`}>
      {title && (
        <header className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="tc-card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{text}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(date);
}

export function daysLeft(date: Date | null | undefined): number | null {
  if (!date) return null;
  return Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}
