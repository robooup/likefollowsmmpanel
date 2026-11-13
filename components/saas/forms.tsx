'use client';

import { useActionState } from 'react';
import type { ActionState } from '@/lib/saas/actions';

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = 'Please wait…',
  buttonClass = 'tc-btn-primary',
  className = 'space-y-4',
  confirm,
  inline = false,
}: {
  action: Action;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  buttonClass?: string;
  className?: string;
  /** Ask the browser to confirm before submitting. */
  confirm?: string;
  /** Lay out fields and button on one row. */
  inline?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      <div className={inline ? 'flex flex-wrap items-end gap-2' : 'space-y-4'}>
        {children}
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? pendingLabel : submitLabel}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      )}
    </form>
  );
}

export function Field({
  label,
  name,
  hint,
  ...input
}: { label: string; name: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="tc-label">
        {label}
      </label>
      <input id={name} name={name} className="tc-input" {...input} />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
