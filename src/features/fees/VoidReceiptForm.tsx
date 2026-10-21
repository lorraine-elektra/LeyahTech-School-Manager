'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';

export function VoidReceiptForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="panel panel--padded no-print" style={{ maxWidth: 640, marginTop: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Void this receipt</h3>
      <p className="muted" style={{ marginBottom: 8 }}>
        Voiding keeps the receipt on record but removes the amount from the student&apos;s account. Use it for duplicate or mistaken entries.
      </p>
      <label className="field">
        <span>Reason</span>
        <input name="reason" required />
      </label>
      {state.error && (
        <div className="notice notice--error" style={{ marginTop: 8 }}>
          {state.error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button" disabled={pending}>
          Void receipt
        </button>
      </div>
    </form>
  );
}
