/**
 * "Export" used to pop a toast reading "Preparing export…" and do nothing — a
 * button that describes work no one is doing. This does the work: it builds a
 * CSV from the rows already on screen and hands it to the browser.
 *
 * Client-side on purpose. The operator selected rows from a table that is
 * already loaded; asking the server to re-fetch and re-serialise them would add
 * an endpoint, a permission and a failure mode to produce the same file.
 */
export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

/** RFC 4180: quote anything containing a comma, quote or newline; double inner quotes. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const head = columns.map((c) => cell(c.header)).join(',');
  const body = rows.map((row) => columns.map((c) => cell(c.value(row))).join(','));
  return [head, ...body].join('\r\n');
}

/**
 * Save the CSV as a file. The BOM is what makes Excel read UTF-8 as UTF-8
 * instead of mangling every accented name in the export.
 */
export function downloadCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob(['﻿' + toCsv(rows, columns)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next turn — revoking synchronously can cancel the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/** `courses-2026-09-12.csv` — dated, so two exports never collide in Downloads. */
export function datedFilename(stem: string): string {
  return `${stem}-${new Date().toISOString().slice(0, 10)}.csv`;
}
