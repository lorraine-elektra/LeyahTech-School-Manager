'use client';

import { startTransition, useActionState, type FormEvent, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import type { FormState } from './formState';

export function ActionForm({
  action,
  submitLabel,
  icon,
  className = 'panel panel--padded',
  children,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  icon?: IconName;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Submitting through onSubmit keeps what the user typed; a form action would reset the fields even when saving fails.
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  };
  return (
    <form onSubmit={submit} className={className}>
      {state.error && (
        <div className="notice notice--error" style={{ marginBottom: 14 }}>
          {state.error}
        </div>
      )}
      {state.saved && (
        <div className="notice notice--success" style={{ marginBottom: 14 }}>
          {state.saved}
        </div>
      )}
      {children}
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          {icon && <Icon name={icon} />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
