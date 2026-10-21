'use client';

import { useActionState, useState } from 'react';
import { CLASS_SCORE_MAX, EXAM_SCORE_MAX, gradeFor, totalScore } from '@/features/school/grading';
import type { SchoolLevel } from '@/features/school/types';
import type { ScoreFormState } from './actions';

interface ScoreRow {
  studentId: string;
  admissionNo: string;
  name: string;
  classScore: number | null;
  examScore: number | null;
}

function toNumber(text: string, max: number): number | null {
  if (text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0 && value <= max ? value : null;
}

export function ScoreSheetForm({
  action,
  rows,
  level,
  readOnly,
}: {
  action: (state: ScoreFormState, formData: FormData) => Promise<ScoreFormState>;
  rows: ScoreRow[];
  level: SchoolLevel;
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [entries, setEntries] = useState(() =>
    Object.fromEntries(rows.map((r) => [r.studentId, { classScore: r.classScore?.toString() ?? '', examScore: r.examScore?.toString() ?? '' }])),
  );
  const update = (studentId: string, field: 'classScore' | 'examScore', value: string) =>
    setEntries((current) => ({ ...current, [studentId]: { ...current[studentId], [field]: value } }));
  const classEntered = Object.values(entries).filter((e) => e.classScore !== '').length;
  const examEntered = Object.values(entries).filter((e) => e.examScore !== '').length;

  return (
    <form action={formAction}>
      <div className="table-toolbar">
        <span className="muted">
          Class scores {classEntered} of {rows.length} · Exam scores {examEntered} of {rows.length}. Leave a box empty if the score is not ready.
        </span>
        {!readOnly && (
          <button type="submit" className="button button--primary" disabled={pending} style={{ marginLeft: 'auto' }}>
            {pending ? 'Saving' : 'Save scores'}
          </button>
        )}
      </div>
      {state.error && <div className="notice notice--error" style={{ marginBottom: 12 }}>{state.error}</div>}
      {state.savedAt && <div className="notice notice--success" style={{ marginBottom: 12 }}>Scores saved.</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="num">No.</th>
              <th>Admission no.</th>
              <th>Student</th>
              <th className="num">Class score ({CLASS_SCORE_MAX})</th>
              <th className="num">Exam ({EXAM_SCORE_MAX})</th>
              <th className="num">Total (100)</th>
              <th className="num">Grade</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const entry = entries[row.studentId];
              const classScore = toNumber(entry.classScore, CLASS_SCORE_MAX);
              const examScore = toNumber(entry.examScore, EXAM_SCORE_MAX);
              const total = classScore !== null && examScore !== null ? totalScore(classScore, examScore) : null;
              const grade = total !== null ? gradeFor(level, total) : undefined;
              const flagged = state.invalid?.includes(row.studentId);
              return (
                <tr key={row.studentId} style={flagged ? { background: '#fbf1f0' } : undefined}>
                  <td className="num">{index + 1}</td>
                  <td className="mono">{row.admissionNo}</td>
                  <td className="nowrap">{row.name}</td>
                  <td className="num">
                    <input
                      className="score-input"
                      name={`class:${row.studentId}`}
                      value={entry.classScore}
                      onChange={(e) => update(row.studentId, 'classScore', e.target.value)}
                      inputMode="decimal"
                      disabled={readOnly}
                      aria-invalid={entry.classScore !== '' && classScore === null}
                    />
                  </td>
                  <td className="num">
                    <input
                      className="score-input"
                      name={`exam:${row.studentId}`}
                      value={entry.examScore}
                      onChange={(e) => update(row.studentId, 'examScore', e.target.value)}
                      inputMode="decimal"
                      disabled={readOnly}
                      aria-invalid={entry.examScore !== '' && examScore === null}
                    />
                  </td>
                  <td className="num">{total ?? ''}</td>
                  <td className="num">{grade?.grade ?? ''}</td>
                  <td>{grade?.remark ?? ''}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
