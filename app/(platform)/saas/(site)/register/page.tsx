import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, Field } from '@/components/saas/forms';
import { registerAction } from '@/lib/saas/actions';

export const metadata: Metadata = { title: 'Create account' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  return (
    <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Create your account</h1>
      <p className="mt-2 text-sm text-slate-600">One account for all your panels. It takes less than a minute.</p>
      <div className="tc-card mt-8 p-6">
        <ActionForm action={registerAction} submitLabel="Create account" pendingLabel="Creating…" buttonClass="tc-btn-primary w-full">
          <input type="hidden" name="plan" value={plan || ''} />
          <Field label="Full name" name="name" autoComplete="name" required minLength={2} maxLength={80} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            hint="At least 8 characters."
          />
        </ActionForm>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="underline">Terms</Link> and{' '}
          <Link href="/privacy" className="underline">Privacy policy</Link>.
        </p>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-emerald-700 hover:underline">
          Log in
        </Link>
      </p>
    </section>
  );
}
