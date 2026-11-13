import type { Metadata } from 'next';
import Link from 'next/link';
import { ActionForm, Field } from '@/components/saas/forms';
import { loginAction } from '@/lib/saas/actions';

export const metadata: Metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <section className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back</h1>
      <p className="mt-2 text-sm text-slate-600">Log in to manage your panels, domains and invoices.</p>
      <div className="tc-card mt-8 p-6">
        <ActionForm action={loginAction} submitLabel="Log in" pendingLabel="Logging in…" buttonClass="tc-btn-primary w-full">
          <input type="hidden" name="next" value={next || ''} />
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        </ActionForm>
      </div>
      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link href="/register" className="font-semibold text-emerald-700 hover:underline">
          Create an account
        </Link>
      </p>
    </section>
  );
}
