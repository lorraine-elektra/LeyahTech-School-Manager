'use client';

import { useActionState } from 'react';
import { decisionOptions } from './decisions';
import type { PromotionFormState } from './actions';

interface Row {
  studentId: string;
  admissionNo: string;
  name: string;
  termAverages: (number | null)[];
  annualAverage: number | null;
  proposed: string | null;
  recorded: string | null;
}

export function PromotionForm({
  action,
  rows,
  termNames,
  canConfirm,
  closedMessage,
}: {
  action: (state: PromotionFormState, formData: FormData) => Promise<PromotionFormState>;
  rows: Row[];
  termNames: string[];
  canConfirm: boolean;
  closedMessage?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction}>
      {closedMessage && <div className="notice notice--info" style={{ marginBottom: 12 }}>{closedMessage}</div>}
      {state.error && <div className="notice notice--error" style={{ marginBottom: 12 }}>{state.error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Admission no.</th>
              <th>Student</th>
              {termNames.map((name) => (
                <th key={name} className="num">
                  {name}
                </th>
              ))}
              <th className="num">Annual average</th>
              <th>Suggested</th>
              <th>Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.studentId}>
                <td className="mono">{row.admissionNo}</td>
                <td className="nowrap">{row.name}</td>
                {row.termAverages.map((average, index) => (
                  <td key={index} className="num">
                    {average ?? <span className="faint">-</span>}
                  </td>
                ))}
                <td className={row.annualAverage !== null && row.annualAverage < 45 ? 'num bad' : 'num'}>{row.annualAverage ?? ''}</td>
                <td className={row.proposed === 'Repeated' ? 'bad' : row.proposed ? undefined : 'faint'}>{row.proposed ?? 'Awaiting results'}</td>
                <td>
                  {row.recorded ? (
                    <strong>{row.recorded}</strong>
                  ) : (
                    <select name={`decision:${row.studentId}`} defaultValue={row.proposed ?? ''} disabled={!canConfirm}>
                      <option value="">Choose</option>
                      {decisionOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canConfirm && rows.some((r) => !r.recorded) && (
        <div className="form-actions">
          <button type="submit" className="button button--primary" disabled={pending}>
            Confirm promotion for this class
          </button>
        </div>
      )}
    </form>
  );
}
