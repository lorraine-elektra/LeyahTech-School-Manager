import type { ReactNode } from 'react';

export type MeterTone = 'accent' | 'good' | 'warn' | 'bad';

export function Meter({ value, tone = 'accent', thin, label }: { value: number; tone?: MeterTone; thin?: boolean; label?: string }) {
  const width = `${Math.max(0, Math.min(100, value))}%`;
  return (
    <div className={thin ? 'meter meter--thin' : 'meter'} role="img" aria-label={label ?? `${Math.round(value)}%`}>
      <span className={tone === 'accent' ? undefined : tone} style={{ width }} />
    </div>
  );
}

export interface BarListRow {
  key: string;
  label: ReactNode;
  value: number;
  display: ReactNode;
  tone?: MeterTone;
}

// Horizontal bars, scaled to `max` (100 for percentages).
export function BarList({ rows, max = 100 }: { rows: BarListRow[]; max?: number }) {
  return (
    <div className="bar-list">
      {rows.map((row) => (
        <div key={row.key} className="bar-list__row">
          <div className="nowrap">{row.label}</div>
          <Meter value={max ? (row.value / max) * 100 : 0} tone={row.tone} />
          <div className="bar-list__value">{row.display}</div>
        </div>
      ))}
    </div>
  );
}

export function ColumnsChart({ columns }: { columns: { key: string; label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...columns.map((c) => c.value));
  return (
    <>
      <div className="columns-chart">
        {columns.map((column) => (
          <div key={column.key} className="columns-chart__col" title={`${column.label}: ${column.display}`}>
            <span className="columns-chart__value">{column.display}</span>
            <div className="columns-chart__bar" style={{ height: `${(column.value / max) * 100}%` }} />
          </div>
        ))}
      </div>
      <div className="columns-chart__labels">
        {columns.map((column) => (
          <span key={column.key}>{column.label}</span>
        ))}
      </div>
    </>
  );
}

export function toneForRate(rate: number | undefined, good = 90, warn = 80): MeterTone {
  if (rate === undefined) return 'accent';
  return rate >= good ? 'good' : rate >= warn ? 'warn' : 'bad';
}
