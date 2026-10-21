'use client';

import { useActionState, useState } from 'react';
import type { AttendanceFormState } from './actions';
import { attendanceStatuses, attendanceStatusLabels } from './summary';
import type { AttendanceStatus } from './types';

interface RollEntry {
  studentId: string;
  admissionNo: string;
  name: string;
  status?: AttendanceStatus;
  note?: string | null;
}

interface AttendanceSheetFormProps {
  action: (state: AttendanceFormState, formData: FormData) => Promise<AttendanceFormState>;
  roll: RollEntry[];
  readOnly: boolean;
  alreadyMarked: boolean;
}

export function AttendanceSheetForm({ action, roll, readOnly, alreadyMarked }: AttendanceSheetFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | undefined>>(() =>
    Object.fromEntries(roll.map((entry) => [entry.studentId, entry.status])),
  );
  const counts = attendanceStatuses.map((status) => [status, Object.values(statuses).filter((s) => s === status).length] as const);
  const unmarked = roll.length - counts.reduce((sum, [, n]) => sum + n, 0);

  return (
    <form action={formAction}>
      <div className="table-toolbar">
        {!readOnly && (
          <button
            type="button"
            className="button"
            onClick={() => setStatuses((current) => Object.fromEntries(roll.map((e) => [e.studentId, current[e.studentId] ?? 'present'])))}
          >
            Mark the rest present
          </button>
        )}
        <span className="muted">
          {counts.map(([status, n]) => `${n} ${attendanceStatusLabels[status].toLowerCase()}`).join(', ')}
          {unmarked > 0 && <span className="warn">, {unmarked} not marked</span>}
        </span>
        {!readOnly && (
          <button type="submit" className="button button--primary" disabled={pending} style={{ marginLeft: 'auto' }}>
            {pending ? 'Saving' : alreadyMarked ? 'Save changes' : 'Save attendance'}
          </button>
        )}
      </div>
      {state.error && <div className="notice notice--error" style={{ marginBottom: 12 }}>{state.error}</div>}
      {state.savedAt && <div className="notice notice--success" style={{ marginBottom: 12 }}>Attendance saved.</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="num">No.</th>
              <th>Admission no.</th>
              <th>Student</th>
              <th>Attendance</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {roll.map((entry, index) => {
              const status = statuses[entry.studentId];
              return (
                <tr key={entry.studentId}>
                  <td className="num">{index + 1}</td>
                  <td className="mono">{entry.admissionNo}</td>
                  <td className="nowrap">{entry.name}</td>
                  <td>
                    <input type="hidden" name={`status:${entry.studentId}`} value={status ?? ''} />
                    <div className="segmented" role="group" aria-label={`Attendance for ${entry.name}`}>
                      {attendanceStatuses.map((option) => (
                        <button
                          key={option}
                          type="button"
                          data-status={option}
                          aria-pressed={status === option}
                          disabled={readOnly}
                          onClick={() => setStatuses((current) => ({ ...current, [entry.studentId]: option }))}
                        >
                          {attendanceStatusLabels[option]}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <input
                      name={`note:${entry.studentId}`}
                      defaultValue={entry.note ?? ''}
                      disabled={readOnly}
                      placeholder={status === 'excused' ? 'Reason given' : ''}
                      style={{ width: 220 }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
