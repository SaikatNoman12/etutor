/**
 * auth.fixture.ts — auth helpers for e2e specs.
 *
 * Canonical template. Provides cookie-based JWT login against the running
 * test app. LLM tests CONSUME these helpers; do not author them per-project.
 *
 * Usage:
 *   const cookie = await loginAndGetCookie(app, 'user@example.com', 'pass');
 *   await request(app.getHttpServer()).get('/api/me').set('Cookie', cookie);
 */
import { INestApplication } from '@nestjs/common';
// Default import works with esModuleInterop. `import * as supertest` produces a
// namespace whose typeof has no call signatures under strict TS — `supertest(app)`
// then fails with TS2349 "This expression is not callable". v60 verify-green
// died with this error across 21 LLM-written specs because this template's
// earlier `import * as` example propagated into every spec.
import supertest from 'supertest';

/**
 * POST /api/auth/login with the given credentials and return the
 * `access_token=...` cookie string (suitable for supertest .set('Cookie', ...)).
 * Throws if login fails or no access_token cookie is returned — tests should
 * NEVER silently proceed unauthenticated.
 */
export async function loginAndGetCookie(
  app: INestApplication,
  email: string,
  password: string,
): Promise<string> {
  const res = await supertest(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password });

  if (res.status >= 400) {
    throw new Error(
      `loginAndGetCookie: /api/auth/login returned ${res.status} for ${email} — ${JSON.stringify(res.body)}`,
    );
  }

  const cookies = res.headers['set-cookie'];
  if (!cookies) {
    throw new Error(
      `loginAndGetCookie: /api/auth/login returned 2xx but no Set-Cookie header (status=${res.status})`,
    );
  }
  const cookieArr = Array.isArray(cookies) ? cookies : [cookies];
  const accessCookie = cookieArr.find((c) => c.startsWith('access_token='));
  if (!accessCookie) {
    throw new Error(
      `loginAndGetCookie: no access_token cookie in Set-Cookie (got: ${cookieArr.map((c) => c.split('=')[0]).join(', ')})`,
    );
  }
  // Strip attributes (Path, HttpOnly, etc.) — keep only `access_token=...`
  return accessCookie.split(';')[0];
}

/**
 * Build a `Cookie` header from a raw token string (useful when caller already
 * has a JWT from a different flow, e.g. signup auto-issues a token).
 */
export function authCookie(token: string): string {
  return `access_token=${token}`;
}
