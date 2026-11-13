import type { Metadata } from 'next';
import { ActionForm } from '@/components/saas/forms';
import { PageTitle, StatusBadge, formatDate } from '@/components/saas/ui';
import { adminCustomerAction } from '@/lib/saas/actions';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { platformDb } from '@/lib/tenant/registry';

export const metadata: Metadata = { title: 'Customers' };

export default async function AdminCustomers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const admin = await requireSaasAdmin();
  const { q } = await searchParams;
  const query = (q || '').trim().slice(0, 100);
  const users = await platformDb().saasUser.findMany({
    where: query ? { OR: [{ email: { contains: query, mode: 'insensitive' } }, { name: { contains: query, mode: 'insensitive' } }] } : {},
    orderBy: { id: 'desc' },
    take: 300,
    include: { _count: { select: { panels: true } } },
  });
  return (
    <>
      <PageTitle title="Customers" subtitle={`${users.length} shown`} />
      <form className="mb-4 flex gap-2" method="get">
        <input name="q" defaultValue={query} placeholder="Search name or email" className="tc-input max-w-sm" />
        <button className="tc-btn-dark" type="submit">Search</button>
      </form>
      <div className="tc-card overflow-x-auto">
        <table className="tc-table w-full">
          <thead>
            <tr><th>ID</th><th>Customer</th><th>Role</th><th>Panels</th><th>Status</th><th>Joined</th><th>Last login</th><th /></tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>#{user.id}</td>
                <td><span className="font-medium text-slate-900">{user.name}</span><span className="block text-xs text-slate-500">{user.email}</span></td>
                <td>{user.role}</td>
                <td>{user._count.panels}</td>
                <td><StatusBadge status={user.status} /></td>
                <td>{formatDate(user.createdAt)}</td>
                <td>{formatDate(user.lastLoginAt)}</td>
                <td className="text-right">
                  {user.id !== admin.id && (
                    <ActionForm
                      action={adminCustomerAction}
                      submitLabel={user.status === 'active' ? 'Block' : 'Unblock'}
                      buttonClass="tc-btn-ghost px-3 py-1.5"
                      className=""
                      confirm={user.status === 'active' ? `Block ${user.email}? They will be signed out.` : undefined}
                      inline
                    >
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="op" value={user.status === 'active' ? 'block' : 'unblock'} />
                    </ActionForm>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
