'use client';

import { useActionState } from 'react';
import { personTitles } from '@/features/school/people';
import { Icon } from '@/ui/Icon';
import { IssuedPassword } from './IssuedPassword';
import type { StaffFormState } from './actions';
import { staffPositions } from './types';

export function AddStaffForm({ action }: { action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form action={formAction} className="panel panel--padded" key={state.issued?.username}>
      {state.issued && (
        <div style={{ marginBottom: 14 }}>
          <IssuedPassword issued={state.issued} />
        </div>
      )}
      {state.error && (
        <div className="notice notice--error" style={{ marginBottom: 14 }}>
          {state.error}
        </div>
      )}
      <div className="form-grid">
        <label className="field">
          <span>Title</span>
          <select name="title" defaultValue={v.title ?? ''} required>
            <option value="">Choose</option>
            {personTitles.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>First name</span>
          <input name="firstName" defaultValue={v.firstName} required />
        </label>
        <label className="field">
          <span>Surname</span>
          <input name="surname" defaultValue={v.surname} required />
        </label>
        <label className="field">
          <span>Position</span>
          <select name="position" defaultValue={v.position ?? 'Teacher'}>
            {staffPositions.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Phone</span>
          <input name="phone" defaultValue={v.phone} placeholder="024 412 6630" inputMode="tel" className="mono" />
        </label>
        <label className="field">
          <span>Qualification</span>
          <input name="qualification" defaultValue={v.qualification} placeholder="B.Ed. Mathematics" />
        </label>
        <label className="field">
          <span>Date joined</span>
          <input name="joinedOn" type="date" defaultValue={v.joinedOn} />
        </label>
      </div>
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={pending}>
          <Icon name="add" /> Add staff member and create login
        </button>
      </div>
    </form>
  );
}
