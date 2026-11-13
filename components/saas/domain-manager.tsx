import {
  addDomainAction,
  changeSubdomainAction,
  removeDomainAction,
  setPrimaryDomainAction,
  verifyDomainAction,
} from '@/lib/saas/actions';
import { ActionForm } from './forms';
import { Card, StatusBadge } from './ui';

type Domain = { id: number; host: string; type: string; status: string; isPrimary: boolean; lastError: string | null };

export function DomainManager({
  panelId,
  domains,
  rootDomain,
  serverIp,
  maxCustomDomains,
  locked,
}: {
  panelId: number;
  domains: Domain[];
  rootDomain: string;
  serverIp: string;
  maxCustomDomains: number;
  /** Panel is terminated: domains can no longer be changed. */
  locked?: boolean;
}) {
  const subdomain = domains.find((d) => d.type === 'subdomain');
  const customCount = domains.filter((d) => d.type === 'custom').length;
  return (
    <Card title="Domains">
      <ul className="divide-y divide-slate-100">
        {domains.map((domain) => (
          <li key={domain.id} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                  <span className="truncate">{domain.host}</span>
                  <StatusBadge status={domain.status} />
                  {domain.isPrimary && (
                    <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">Primary</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">{domain.type === 'subdomain' ? 'Free subdomain' : 'Custom domain'}</p>
              </div>
              {!locked && (
                <div className="flex flex-wrap gap-2">
                  {domain.status === 'pending' && domain.type === 'custom' && (
                    <ActionForm action={verifyDomainAction} submitLabel="Verify" pendingLabel="Checking…" buttonClass="tc-btn-primary px-3 py-1.5" className="" inline>
                      <input type="hidden" name="panelId" value={panelId} />
                      <input type="hidden" name="domainId" value={domain.id} />
                    </ActionForm>
                  )}
                  {domain.status === 'active' && !domain.isPrimary && (
                    <ActionForm action={setPrimaryDomainAction} submitLabel="Make primary" buttonClass="tc-btn-ghost px-3 py-1.5" className="" inline>
                      <input type="hidden" name="panelId" value={panelId} />
                      <input type="hidden" name="domainId" value={domain.id} />
                    </ActionForm>
                  )}
                  {domain.type === 'custom' && (
                    <ActionForm
                      action={removeDomainAction}
                      submitLabel="Remove"
                      buttonClass="tc-btn-ghost px-3 py-1.5 text-rose-600"
                      className=""
                      confirm={`Remove ${domain.host} from this panel?`}
                      inline
                    >
                      <input type="hidden" name="panelId" value={panelId} />
                      <input type="hidden" name="domainId" value={domain.id} />
                    </ActionForm>
                  )}
                </div>
              )}
            </div>
            {domain.status === 'pending' && domain.type === 'custom' && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">Point this domain to us, then press Verify</p>
                <p className="mt-1">In your domain’s DNS settings add one of these records:</p>
                <ul className="mt-2 space-y-1 font-mono text-xs">
                  {serverIp && (
                    <li>
                      A &nbsp; {domain.host.split('.').length > 2 ? domain.host.split('.')[0] : '@'} &nbsp;→&nbsp; {serverIp}
                    </li>
                  )}
                  <li>
                    CNAME &nbsp; {domain.host.split('.').length > 2 ? domain.host.split('.')[0] : 'www'} &nbsp;→&nbsp; {subdomain?.host || rootDomain}
                  </li>
                </ul>
                <p className="mt-2 text-xs">
                  If you use Cloudflare, set the record to “DNS only” (grey cloud) first. DNS changes can take from a few minutes up to a few hours.
                </p>
                {domain.lastError && <p className="mt-2 text-xs font-medium text-rose-700">Last check: {domain.lastError}</p>}
              </div>
            )}
          </li>
        ))}
      </ul>

      {!locked && (
        <div className="mt-2 grid gap-6 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Add your own domain</h3>
            <p className="mb-3 mt-1 text-xs text-slate-500">
              {customCount} of {maxCustomDomains} custom domain{maxCustomDomains === 1 ? '' : 's'} used on your plan.
            </p>
            <ActionForm action={addDomainAction} submitLabel="Add domain" pendingLabel="Adding…" inline>
              <input type="hidden" name="panelId" value={panelId} />
              <input name="domain" className="tc-input min-w-0 flex-1" placeholder="example.com" required aria-label="Domain name" autoCapitalize="none" />
            </ActionForm>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Change free subdomain</h3>
            <p className="mb-3 mt-1 text-xs text-slate-500">The old address stops working as soon as you change it.</p>
            <ActionForm
              action={changeSubdomainAction}
              submitLabel="Change"
              pendingLabel="Changing…"
              buttonClass="tc-btn-ghost"
              confirm="Change the subdomain? The old address will stop working."
              inline
            >
              <input type="hidden" name="panelId" value={panelId} />
              <div className="flex min-w-0 flex-1">
                <input
                  name="subdomain"
                  className="tc-input min-w-0 rounded-r-none"
                  defaultValue={subdomain?.host.replace(`.${rootDomain}`, '') || ''}
                  required
                  aria-label="Subdomain"
                  autoCapitalize="none"
                />
                <span className="inline-flex items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs text-slate-600">
                  .{rootDomain}
                </span>
              </div>
            </ActionForm>
          </div>
        </div>
      )}
    </Card>
  );
}
