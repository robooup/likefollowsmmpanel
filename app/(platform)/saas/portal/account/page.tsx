import type { Metadata } from 'next';
import { ActionForm, Field } from '@/components/saas/forms';
import { Card, PageTitle } from '@/components/saas/ui';
import { changePasswordAction, updateProfileAction } from '@/lib/saas/actions';
import { requireSaasUser } from '@/lib/saas/auth';

export const metadata: Metadata = { title: 'Account' };

export default async function AccountPage() {
  const user = await requireSaasUser();
  return (
    <>
      <PageTitle title="Account" subtitle="Your TopupCraft login. This is separate from the admin login of each panel." />
      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Profile">
          <ActionForm action={updateProfileAction} submitLabel="Save profile">
            <Field label="Full name" name="name" defaultValue={user.name} required minLength={2} maxLength={80} />
            <Field label="Email" name="email-display" value={user.email} disabled readOnly hint="Contact support to change your email." />
          </ActionForm>
        </Card>
        <Card title="Change password">
          <ActionForm action={changePasswordAction} submitLabel="Update password">
            <Field label="Current password" name="current" type="password" autoComplete="current-password" required />
            <Field label="New password" name="password" type="password" autoComplete="new-password" required minLength={8} hint="At least 8 characters." />
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
