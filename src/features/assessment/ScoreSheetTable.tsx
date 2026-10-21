import Link from 'next/link';
import type { ScoreSheetProgress } from './progress';

export function ScoreSheetTable({ base, sheets, showClass = true }: { base: string; sheets: ScoreSheetProgress[]; showClass?: boolean }) {
  if (sheets.length === 0) return <div className="table-wrap"><p className="empty">No score sheets are assigned to you this year.</p></div>;
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {showClass && <th>Class</th>}
            <th>Subject</th>
            <th className="num">On roll</th>
            <th className="num">Class scores</th>
            <th className="num">Exam scores</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((sheet) => (
            <tr key={`${sheet.schoolClass.id}-${sheet.subject.id}`}>
              {showClass && <td className="nowrap">{sheet.schoolClass.name}</td>}
              <td>{sheet.subject.name}</td>
              <td className="num">{sheet.onRoll}</td>
              <td className={`num ${sheet.classScoresEntered === 0 ? 'bad' : sheet.classScoresEntered < sheet.onRoll ? 'warn' : ''}`}>
                {sheet.classScoresEntered} of {sheet.onRoll}
              </td>
              <td className="num">
                {sheet.examScoresEntered} of {sheet.onRoll}
              </td>
              <td>
                <Link href={`${base}/scores/${sheet.schoolClass.id}/${sheet.subject.id}`}>Open sheet</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
