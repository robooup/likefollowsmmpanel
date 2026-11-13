import type { Metadata } from 'next';
import Link from 'next/link';
import { PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Panels' };

const STATUSES = ['active', 'pending_payment', 'expired', 'suspended', 'failed', 'terminated'];

export default async function AdminPanels({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireSaasAdmin();
  const { status, q } = await searchParams;
  const query = (q || '').trim().slice(0, 100);
  const panels = await platformDb().saasPanel.findMany({
    where: {
      ...(status && STATUSES.includes(status) ? { status } : {}),
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { owner: { email: { contains: query, mode: 'insensitive' } } },
              { domains: { some: { host: { contains: query.toLowerCase() } } } },
            ],
          }
        : {}),
    },
    orderBy: { id: 'desc' },
    take: 300,
    include: { owner: { select: { email: true } }, plan: { select: { name: true } }, domains: { where: { isPrimary: true }, take: 1 } },
  });

  return (
    <>
      <PageTitle title="Panels" subtitle={`${panels.length} shown`} />
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <input name="q" defaultValue={query} placeholder="Search name, owner email or domain" className="tc-input max-w-sm" />
        <select name="status" defaultValue={status || ''} className="tc-input max-w-[200px]">
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace('_', ' ')}</option>
          ))}
        </select>
        <button className="tc-btn-dark" type="submit">Filter</button>
      </form>
      <div className="tc-card overflow-x-auto">
        <table className="tc-table w-full">
          <thead>
            <tr>
              <th>ID</th>
              <th>Panel</th>
              <th>Owner</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Paid until</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {panels.map((panel) => (
              <tr key={panel.id}>
                <td>#{panel.id}</td>
                <td>
                  <span className="font-medium text-slate-900">{panel.name}</span>
                  <span className="block text-xs text-slate-500">{panel.domains[0]?.host || '—'}</span>
                </td>
                <td>{panel.owner.email}</td>
                <td>{panel.plan.name}</td>
                <td><StatusBadge status={panel.status} /></td>
                <td>{formatDate(panel.expiresAt)}</td>
                <td className="text-right">
                  <Link href={`/admin/panels/${panel.id}`} className="font-semibold text-emerald-700 hover:underline">Manage</Link>
                </td>
              </tr>
            ))}
            {panels.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-slate-500">No panels match.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
