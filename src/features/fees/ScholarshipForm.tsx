'use client';

import { useActionState } from 'react';
import type { Term } from '@/features/school/types';
import type { FormState } from './actions';

export function ScholarshipForm({ action, terms, currentTermId }: { action: (state: FormState, formData: FormData) => Promise<FormState>; terms: Term[]; currentTermId: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? {};
  const termOptions = terms.map((t) => (
    <option key={t.id} value={t.id}>
      {t.name} {t.academicYear}
    </option>
  ));
  return (
    <form action={formAction} className="panel panel--padded">
      <div className="form-grid">
        <label className="field">
          <span>Admission no.</span>
          <input name="admissionNo" defaultValue={values.admissionNo} placeholder="STU/2026/0143" required className="mono" />
        </label>
        <label className="field">
          <span>Name</span>
          <input name="name" defaultValue={values.name} placeholder="Staff child, Sibling discount" required />
        </label>
        <label className="field">
          <span>Basis</span>
          <select name="basis" defaultValue={values.basis ?? 'percentOfTuition'}>
            <option value="percentOfTuition">Percentage of tuition</option>
            <option value="fixedPerTerm">Fixed amount per term</option>
          </select>
        </label>
        <label className="field">
          <span>Percentage or amount</span>
          <input name="value" inputMode="decimal" defaultValue={values.value} required className="mono" />
        </label>
        <label className="field">
          <span>First term</span>
          <select name="fromTermId" defaultValue={values.fromTermId ?? currentTermId}>
            {termOptions}
          </select>
        </label>
        <label className="field">
          <span>Last term</span>
          <select name="toTermId" defaultValue={values.toTermId ?? ''}>
            <option value="">Until stopped</option>
            {termOptions}
          </select>
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Notes</span>
          <input name="notes" defaultValue={values.notes} placeholder="Who approved it and why" />
        </label>
      </div>
      {state.error && (
        <div className="notice notice--error" style={{ marginTop: 12 }}>
          {state.error}
        </div>
      )}
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          Add scholarship
        </button>
      </div>
    </form>
  );
}
