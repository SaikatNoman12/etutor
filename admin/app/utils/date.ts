/**
 * One way to write a date on screen.
 *
 * The app had three: `2026-09-12` (an ISO string cut to ten characters),
 * `9/12/2026` (`toLocaleDateString()` with no options, which means something
 * different in Dhaka than in Denver), and nothing at all. A person reading an
 * order does not parse ISO, and an ambiguous 9/12 is worse than either.
 *
 * `12 Sep 2026` — the month named, so it cannot be misread, in the language the
 * app is currently speaking.
 *
 * Machine-facing values keep their ISO shape on purpose: a `<input type="date">`
 * only accepts YYYY-MM-DD, and a CSV is read by a spreadsheet.
 */
import i18next from 'i18next';

function parse(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function locale(): string {
  return i18next.language || 'en';
}

/** `12 Sep 2026`, or the empty string when there is no date to show. */
export function formatDate(value: unknown, fallback = ''): string {
  const d = parse(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/** `12 Sep 2026, 14:30` — for the places where the hour is part of the answer. */
export function formatDateTime(value: unknown, fallback = ''): string {
  const d = parse(value);
  if (!d) return fallback;
  return new Intl.DateTimeFormat(locale(), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/** YYYY-MM-DD — what `<input type="date">` and a CSV column need. */
export function toDateInputValue(value: unknown): string {
  const d = parse(value);
  if (!d) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
