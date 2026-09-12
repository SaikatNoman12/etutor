/**
 * Client-side form validation — the rules, in one place.
 *
 * These MIRROR the server's DTOs deliberately. Client validation that is
 * stricter than the server annoys people for no reason; client validation that
 * is looser is worse, because the form says yes and the request says no, and
 * the person has to guess which field the sentence was about.
 *
 * It is not a replacement for the server's checks — it is the fast, local half
 * of the same contract, so a blank Email is caught before a round trip and a
 * password the server would reject is rejected here with the same wording.
 *
 * Usage:
 *   const errors = validate(values, { email: [required('Email'), email()] });
 *   if (Object.keys(errors).length) { setErrors(errors); return; }
 */

export type Rule = (value: unknown) => string | null;
export type Rules = Record<string, Rule[]>;
export type FieldErrors = Record<string, string>;

const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

/** Mirrors @IsNotEmpty. */
export const required = (label: string): Rule => (v) =>
  str(v).trim() ? null : `${label} is required.`;

/** Mirrors @IsEmail. Deliberately permissive — the server is the authority on
 *  deliverability; this only catches what is obviously not an address. */
export const email = (): Rule => (v) => {
  const s = str(v).trim();
  if (!s) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? null : 'Enter a valid email address.';
};

/** Mirrors @MinLength. */
export const minLength = (label: string, n: number): Rule => (v) => {
  const s = str(v).trim();
  if (!s) return null;
  return s.length >= n ? null : `${label} must be at least ${n} characters.`;
};

/** Mirrors @MaxLength. */
export const maxLength = (label: string, n: number): Rule => (v) => {
  const s = str(v);
  return s.length <= n ? null : `${label} must be ${n} characters or fewer.`;
};

/**
 * Mirrors PASSWORD_PATTERN in the backend's signup DTO —
 * /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/ — and its message, word for word. If one
 * changes, this is the other place to change; a mismatch here means a password
 * the form accepts and the API refuses.
 */
export const password = (): Rule => (v) => {
  const s = str(v);
  if (!s) return null;
  return /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/.test(s)
    ? null
    : 'Password must be 8-64 characters and include letters and numbers.';
};

/** Both fields must agree (password + confirmation). */
export const sameAs = (other: string, label: string): Rule =>
  ((v: unknown, all?: Record<string, unknown>) =>
    !all || str(v) === str(all[other]) ? null : `${label} does not match.`) as Rule;

/** Mirrors @IsNumber/@Min — used by the admin's price, discount and order fields. */
export const number = (label: string, opts: { min?: number; max?: number } = {}): Rule => (v) => {
  const s = str(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (opts.min !== undefined && n < opts.min) return `${label} must be ${opts.min} or more.`;
  if (opts.max !== undefined && n > opts.max) return `${label} must be ${opts.max} or less.`;
  return null;
};

/** Mirrors the slug column: lowercase, digits and single hyphens. */
export const slug = (label: string): Rule => (v) => {
  const s = str(v).trim();
  if (!s) return null;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)
    ? null
    : `${label} may use lowercase letters, numbers and hyphens only.`;
};

/** Run the rules. Stops at the first failure per field — one complaint at a time. */
export function validate(values: Record<string, unknown>, rules: Rules): FieldErrors {
  const out: FieldErrors = {};
  for (const [field, list] of Object.entries(rules)) {
    for (const rule of list) {
      const msg = (rule as (v: unknown, all?: Record<string, unknown>) => string | null)(values[field], values);
      if (msg) { out[field] = msg; break; }
    }
  }
  return out;
}

/** Read a form's current values without wiring every input to state. */
export function readForm(root: Element | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  root?.querySelectorAll<HTMLInputElement>('input[name], textarea[name], select[name]').forEach((el) => {
    out[el.name] = el.type === 'checkbox' ? String(el.checked) : el.value;
  });
  return out;
}

/**
 * The field errors the API returned, if it returned any.
 *
 * The backend answers a rejected form with `{ message, errors: { email: '…' } }`
 * so the same inputs can be marked from a server response as from a local
 * check — one error surface, not two.
 */
export function serverFieldErrors(err: unknown): FieldErrors {
  const e = err as { response?: { data?: { errors?: unknown } }; errors?: unknown };
  const bag = e?.response?.data?.errors ?? e?.errors;
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) return {};
  const out: FieldErrors = {};
  for (const [k, v] of Object.entries(bag as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}
