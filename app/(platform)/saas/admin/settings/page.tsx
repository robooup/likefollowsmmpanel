import type { Metadata } from 'next';
import { ActionForm, Field } from '@/components/saas/forms';
import { Card, PageTitle } from '@/components/saas/ui';
import { adminSaveSettingsAction } from '@/lib/saas/actions';
import { requireSaasAdmin } from '@/lib/saas/auth';
import { getSaasSettings } from '@/lib/saas/settings';
import { platformRootDomain, serverIp } from '@/lib/tenant/config';
import { baseUrlSync } from '@/lib/tenant/url';

export const metadata: Metadata = { title: 'Settings' };

export default async function AdminSettings() {
  await requireSaasAdmin();
  const settings = await getSaasSettings(true);
  const keySet = !!settings.uddoktapayApiKey;
  return (
    <>
      <PageTitle title="Settings" subtitle="Payment gateway and billing rules for the TopupCraft site." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Payments and billing" className="lg:col-span-2">
          <ActionForm action={adminSaveSettingsAction} submitLabel="Save settings">
            <Field
              label="UddoktaPay API URL"
              name="uddoktapayBaseUrl"
              defaultValue={settings.uddoktapayBaseUrl}
              placeholder="https://pay.yourdomain.com/api"
              hint="The “API URL” from your UddoktaPay dashboard (Brand settings)."
            />
            <Field
              label="UddoktaPay API key"
              name="uddoktapayApiKey"
              type="password"
              autoComplete="off"
              placeholder={keySet ? '•••••••• (saved — leave empty to keep)' : 'Paste your API key'}
              hint={keySet ? 'A key is saved. Enter a new one only if you want to replace it.' : 'Not set yet. Customers cannot pay online until this is added.'}
            />
            <Field label="Support email shown to customers" name="supportEmail" type="email" defaultValue={settings.supportEmail} />
            <Field
              label="Grace days after expiry"
              name="graceDays"
              type="number"
              min={0}
              max={60}
              defaultValue={settings.graceDays}
              hint="How many days an unpaid panel stays online after its paid period ends."
            />
          </ActionForm>
        </Card>
        <Card title="Server">
          <dl className="space-y-4 text-sm">
            <div><dt className="text-slate-500">Panel subdomains</dt><dd className="font-mono text-xs text-slate-900">*.{platformRootDomain()}</dd></div>
            <div><dt className="text-slate-500">Server IP shown in DNS instructions</dt><dd className="font-mono text-xs text-slate-900">{serverIp() || 'SERVER_IP not set'}</dd></div>
            <div><dt className="text-slate-500">Payment webhook URL</dt><dd className="break-all font-mono text-xs text-slate-900">{baseUrlSync()}/api/saas/payment/webhook</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">These come from the server’s environment file and are changed there.</p>
        </Card>
      </div>
    </>
  );
}
