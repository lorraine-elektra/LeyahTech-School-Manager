'use client';

import { useActionState } from 'react';
import type { StudentFormState } from './actions';

export function ExitForm({ action, today }: { action: (state: StudentFormState, formData: FormData) => Promise<StudentFormState>; today: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form action={formAction} className="panel panel--padded" style={{ maxWidth: 640 }}>
      <div className="form-grid">
        <label className="field">
          <span>Type</span>
          <select name="kind" defaultValue={v.kind ?? 'Withdrawal'}>
            <option>Withdrawal</option>
            <option>Transfer out</option>
          </select>
        </label>
        <label className="field">
          <span>Last day in school</span>
          <input type="date" name="date" defaultValue={v.date ?? today} max={today} required />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>New school (for transfers)</span>
          <input name="destination" defaultValue={v.destination} />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Reason</span>
          <input name="reason" defaultValue={v.reason} placeholder="Family relocated to Kumasi" required />
        </label>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        The student stays on record with their results, attendance and fee history. Any unpaid balance stays on their account.
      </p>
      {state.error && (
        <div className="notice notice--error" style={{ marginTop: 12 }}>
          {state.error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          Record exit
        </button>
      </div>
    </form>
  );
}
