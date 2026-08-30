/**
 * RR7 form actions for login + register (canonical).
 *
 * v72: replaces the prior STUB which validated the form schema and
 * returned `{ message: 'Login successful' }` without ever calling the
 * backend. The stub silently broke any `<form action={loginAction}>`
 * page — v71 evidence: the admin-dashboard frontend cell got 0/10 story
 * pass rate because its login.tsx used loginAction and authentication
 * never actually happened, AuthGuard rejected on SSR, all 10 stories
 * failed at "page not reachable".
 *
 * This version:
 * - Removes 'use server' so the action runs in the browser, letting it
 *   set the httpOnly auth cookies via `credentials: 'include'`.
 * - POSTs to <VITE_API_URL>/auth/login (or /auth/signup) with the form
 *   body the backend's canonical auth controller expects.
 * - Returns the parsed body on success (caller usually navigates) or a
 *   structured error JSON for the form's `useActionState` consumer.
 *
 * Mirrors what scaffold-auth-pages' LoginPage.tsx does via Redux thunks;
 * both paths now work, regardless of which file routes.ts wires.
 */
import { z } from 'zod';
import { loginSchema, registerSchema } from '~/utils/validations/auth';

/**
 * What `useActionState` receives back from these actions.
 *
 * This used to borrow `LoginResponse` from ~/types/auth, which is the API's auth
 * response (a user plus tokens) — a different thing from a form-action result, and
 * neither `{ error }` nor `{ message, data }` is assignable to it. Every return
 * therefore needed an `as` cast to compile, and it only compiled at all because the
 * generated auth.d.ts declared LoginResponse twice, which makes it an error type that
 * accepts anything. With one honest definition the casts are unnecessary.
 */
export interface AuthActionState {
  /** Set on success — the page shows it, or navigates away. */
  message?: string;
  /** The parsed response body on success. */
  data?: unknown;
  /** JSON-encoded field errors: `{"email":"…"}`, or `{"form":"…"}` for the whole form. */
  error?: string;
}

function apiBase(): string {
  // Vite injects import.meta.env at build time; guard for the SSR pass where it is absent.
  // Typed as a narrow record rather than `any` — the only field read is VITE_API_URL — and the
  // fallback is same-origin `/api`, not a hardcoded host and port this app may not be served on.
  const meta = import.meta as ImportMeta & { env?: Record<string, string | undefined> };
  const env: Record<string, string | undefined> =
    (typeof import.meta !== 'undefined' ? meta.env : undefined) ?? {};
  const base = env.VITE_API_URL || '/api';
  return base.replace(/\/$/, '');
}

async function postAuth(path: string, body: unknown): Promise<{ ok: boolean; data?: unknown; error?: string }> {
  try {
    const res = await fetch(`${apiBase()}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = res.status === 401 ? 'Invalid credentials' : 'Authentication failed';
      try {
        const err = await res.json();
        if (err && typeof err === 'object') msg = (err as Record<string, unknown>).message as string ?? msg;
      } catch { /* non-JSON error body — fall back to default msg */ }
      return { ok: false, error: msg };
    }
    let data: unknown = null;
    try { data = await res.json(); } catch { /* empty body is OK */ }
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

function zodErrorsToJson(error: z.ZodError): string {
  const errors: Record<string, string> = {};
  error.errors.forEach((err) => {
    const key = String(err.path[0] ?? 'form');
    errors[key] = err.message;
  });
  return JSON.stringify(errors);
}

// `_prevState` is useActionState's previous value, which this action never reads — `unknown`
// states that honestly, where `any` needed a lint suppression to say the same thing.
export async function loginAction(_prevState: unknown, formData: FormData): Promise<AuthActionState> {
  try {
    const data = loginSchema.parse(Object.fromEntries(formData));
    const result = await postAuth('/auth/login', data);
    if (!result.ok) {
      return { error: JSON.stringify({ form: result.error ?? 'Invalid credentials' }) };
    }
    return { message: 'Login successful', data: result.data };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: zodErrorsToJson(error) };
    }
    return { error: JSON.stringify({ form: 'Invalid credentials' }) };
  }
}

export async function registerAction(_prevState: unknown, formData: FormData): Promise<AuthActionState> {
  try {
    const data = registerSchema.parse(Object.fromEntries(formData));
    // SignupDto whitelists { email, password, role?, passwordConfirm? } and rejects
    // unknown keys (forbidNonWhitelisted). `confirmPassword` is a client-only match
    // check — send only the fields the DTO accepts.
    const result = await postAuth('/auth/signup', { email: data.email, password: data.password });
    if (!result.ok) {
      return { error: JSON.stringify({ form: result.error ?? 'Registration failed' }) };
    }
    return { message: 'Registration successful', data: result.data };
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return { error: zodErrorsToJson(error) };
    }
    return { error: JSON.stringify({ form: 'Registration failed' }) };
  }
}
