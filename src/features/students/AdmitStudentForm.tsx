'use client';

import { useActionState } from 'react';
import { guardianRelationships, personTitles } from '@/features/school/people';
import type { SchoolClass } from '@/features/school/types';
import type { StudentFormState } from './actions';

export function AdmitStudentForm({ action, classes, today }: { action: (state: StudentFormState, formData: FormData) => Promise<StudentFormState>; classes: SchoolClass[]; today: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const v = state.values ?? {};
  return (
    <form action={formAction}>
      <section className="section">
        <h2 style={{ marginBottom: 8 }}>Student</h2>
        <div className="panel panel--padded form-grid">
          <label className="field">
            <span>Surname</span>
            <input name="surname" defaultValue={v.surname} required />
          </label>
          <label className="field">
            <span>First name</span>
            <input name="firstName" defaultValue={v.firstName} required />
          </label>
          <label className="field">
            <span>Other names</span>
            <input name="otherNames" defaultValue={v.otherNames} />
          </label>
          <label className="field">
            <span>Sex</span>
            <select name="gender" defaultValue={v.gender ?? ''} required>
              <option value="" disabled>
                Choose
              </option>
              <option value="F">Female</option>
              <option value="M">Male</option>
            </select>
          </label>
          <label className="field">
            <span>Date of birth</span>
            <input name="dateOfBirth" type="date" defaultValue={v.dateOfBirth} max={today} required />
          </label>
          <label className="field">
            <span>Class</span>
            <select name="classId" defaultValue={v.classId ?? ''} required>
              <option value="" disabled>
                Choose
              </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Admission type</span>
            <select name="admissionType" defaultValue={v.admissionType ?? 'New admission'}>
              <option>New admission</option>
              <option>Transfer in</option>
            </select>
          </label>
          <label className="field">
            <span>Previous school</span>
            <input name="previousSchool" defaultValue={v.previousSchool} />
          </label>
          <label className="field">
            <span>Admission date</span>
            <input name="admittedOn" type="date" defaultValue={v.admittedOn ?? today} max={today} required />
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span>Medical notes</span>
            <input name="medicalNotes" defaultValue={v.medicalNotes} placeholder="Allergies, conditions, medication kept at school" />
          </label>
        </div>
      </section>

      <section className="section">
        <h2 style={{ marginBottom: 8 }}>Parent or guardian</h2>
        <div className="panel panel--padded">
          <label className="field" style={{ maxWidth: 320 }}>
            <span>Sibling already in the school (admission no.)</span>
            <input name="siblingAdmissionNo" defaultValue={v.siblingAdmissionNo} placeholder="STU/2025/0034" className="mono" />
          </label>
          <p className="muted" style={{ margin: '8px 0 12px' }}>
            If a sibling is already enrolled, enter their number and leave the guardian details empty. The same parent account will see both children.
          </p>
          <div className="form-grid">
            <label className="field">
              <span>Title</span>
              <select name="guardianTitle" defaultValue={v.guardianTitle ?? ''}>
                <option value="">Choose</option>
                {personTitles.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Full name</span>
              <input name="guardianName" defaultValue={v.guardianName} />
            </label>
            <label className="field">
              <span>Relationship</span>
              <select name="relationship" defaultValue={v.relationship ?? ''}>
                <option value="">Choose</option>
                {guardianRelationships.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Phone</span>
              <input name="guardianPhone" defaultValue={v.guardianPhone} placeholder="024 412 6630" inputMode="tel" className="mono" />
            </label>
            <label className="field">
              <span>Other phone</span>
              <input name="guardianAltPhone" defaultValue={v.guardianAltPhone} inputMode="tel" className="mono" />
            </label>
            <label className="field">
              <span>Occupation</span>
              <input name="occupation" defaultValue={v.occupation} />
            </label>
            <label className="field">
              <span>Residence</span>
              <input name="residence" defaultValue={v.residence} placeholder="Area or town" />
            </label>
          </div>
        </div>
      </section>

      {state.error && (
        <div className="notice notice--error" style={{ marginTop: 16 }}>
          {state.error}
        </div>
      )}
      <div className="form-actions">
        <button type="submit" className="button button--primary" disabled={pending}>
          {pending ? 'Saving' : 'Admit student'}
        </button>
      </div>
    </form>
  );
}
