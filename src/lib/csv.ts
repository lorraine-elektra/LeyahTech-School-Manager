type Cell = string | number | null | undefined;

function escape(cell: Cell): string {
  const text = cell === null || cell === undefined ? '' : String(cell);
  // A leading = + - or @ would run as a formula when the file is opened in Excel.
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  return [header, ...rows].map((row) => row.map(escape).join(',')).join('\r\n') + '\r\n';
}

export function csvResponse(filename: string, csv: string): Response {
  // The byte order mark makes Excel read GH₵ and accented names correctly.
  return new Response(`﻿${csv}`, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
