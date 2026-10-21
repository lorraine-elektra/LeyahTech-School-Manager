'use client';

import { useActionState } from 'react';
import type { FormState } from './actions';
import { paymentMethods } from './types';

interface PaymentFormProps {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  defaultPayer: string;
  today: string;
}

export function PaymentForm({ action, defaultPayer, today }: PaymentFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? {};
  return (
    <form action={formAction} className="panel panel--padded">
      <div className="form-grid">
        <label className="field">
          <span>Amount (GH₵)</span>
          <input name="amount" inputMode="decimal" defaultValue={values.amount} required autoFocus className="mono" />
        </label>
        <label className="field">
          <span>Method</span>
          <select name="method" defaultValue={values.method ?? 'Mobile Money'}>
            {paymentMethods.map((method) => (
              <option key={method}>{method}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Reference</span>
          <input name="reference" defaultValue={values.reference} placeholder="MoMo transaction ID, slip or cheque no." />
        </label>
        <label className="field">
          <span>Paid by</span>
          <input name="paidBy" defaultValue={values.paidBy ?? defaultPayer} required />
        </label>
        <label className="field">
          <span>Date paid</span>
          <input name="paidOn" type="date" defaultValue={values.paidOn ?? today} max={today} required />
        </label>
      </div>
      {state.error && (
        <div className="notice notice--error" style={{ marginTop: 12 }}>
          {state.error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? 'Saving' : 'Record payment and issue receipt'}
        </button>
      </div>
    </form>
  );
}
