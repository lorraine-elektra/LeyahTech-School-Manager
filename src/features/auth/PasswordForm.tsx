'use client';

import { useActionState } from 'react';
import type { PasswordFormState } from './accountActions';
import { MIN_PASSWORD_LENGTH } from './passwordRules';

export function PasswordForm({ action, continueHref }: { action: (state: PasswordFormState, formData: FormData) => Promise<PasswordFormState>; continueHref: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  if (state.saved) {
    return (
      <div className="notice notice--success" style={{ display: 'block' }}>
        Your password has been changed. Other devices signed in to your account have been signed out. <a href={continueHref}>Continue to the overview</a>.
      </div>
    );
  }
  return (
    <form action={formAction} className="panel panel--padded" style={{ maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="field">
        <span>Current password</span>
        <input name="current" type="password" autoComplete="current-password" required />
      </label>
      <label className="field">
        <span>New password</span>
        <input name="next" type="password" autoComplete="new-password" minLength={MIN_PASSWORD_LENGTH} required />
        <span className="field__hint">At least {MIN_PASSWORD_LENGTH} characters. A short phrase is easier to remember, for example osu-castle-14.</span>
      </label>
      <label className="field">
        <span>New password again</span>
        <input name="confirm" type="password" autoComplete="new-password" required />
      </label>
      {state.error && <div className="notice notice--error">{state.error}</div>}
      <div>
        <button className="button button--primary" type="submit" disabled={pending}>
          Change password
        </button>
      </div>
    </form>
  );
}
