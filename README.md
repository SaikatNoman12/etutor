# E-Tutor

A full-stack e-learning platform: a course catalogue, a cart and checkout, enrolment and
lesson progress, and an admin console for the people who run it.

One NestJS API serves two React Router 7 apps — a student site and an admin console —
against PostgreSQL.

| | Stack | Port |
|---|---|---|
| `backend/` | NestJS · TypeORM · PostgreSQL · JWT in httpOnly cookies | 3900 |
| `admin/` | React Router 7 (framework mode) · Tailwind v4 · TanStack Query | 3901 |
| `student/` | React Router 7 (framework mode) · Tailwind v4 · TanStack Query | 3902 |

## Features

- **Catalogue** — courses, categories, instructors, search/filter/sort, and a course detail
  page with its syllabus. All public: no session required.
- **Commerce** — cart with quantities and coupons, checkout, orders, payment, and the
  enrolment that payment creates.
- **Learning** — my-learning, the course player, per-lesson progress.
- **Admin console** — dashboard, courses, course detail, categories, users, orders, order
  detail, enrolments, coupons.
- **Auth** — signup, signin, session in an httpOnly cookie, refresh, and three roles
  (student · instructor · admin) enforced server-side by a role guard.

24 screens in all, each one exercised end to end in a real browser: 14 student, 10 admin.

## Running it

**1. Database.** A local Postgres in Docker on port 5439:

    docker run -d --name etutor-postgres \
      -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=etutor \
      -p 5439:5432 postgres:16-alpine

**2. Environment.** Each project ships a `.env.example` listing every key it reads. Copy
them; for local development the only value worth changing is the JWT secret.

    for d in backend admin student; do cp $d/.env.example $d/.env; done

**3. Install and start** (three terminals, or background them):

    (cd backend  && npm install && npm run start:dev)   # :3900
    (cd admin    && npm install && npm run dev)         # :3901
    (cd student  && npm install && npm run dev)         # :3902

**4. Seed** the catalogue, the coupons and the test accounts:

    (cd backend && npm run seed)

The demo data lives in `backend/src/database/fixtures/seed.fixtures.yaml`. Re-run the seed
after the e2e suite — those specs truncate the database.

### Test accounts

All seeded by step 4; the passwords are in the fixtures file above.

| Account | Role |
|---|---|
| `student@etutor.test`, `student2@etutor.test` | student |
| `instructor@etutor.test`, `instructor2@etutor.test` | instructor |
| `admin@etutor.test` | admin |

## Tests

    (cd backend  && npx jest test/unit)   # 36 unit tests
    (cd backend  && npm run test:e2e)     # 103 e2e tests — truncates the DB, re-seed after
    (cd admin    && npm run test:unit)    # 27
    (cd student  && npm run test:unit)    # 35

`npm run test` in the backend matches `.spec.ts` **and** `.e2e-spec.ts`, so it runs the e2e
suites too and leaves the database empty. Scope it to `test/unit` for the unit tests alone.

Typecheck:

    (cd backend && npm run typecheck) && (cd admin && npm run typecheck) && (cd student && npm run typecheck)

## Layout

```
backend/
  src/modules/<domain>/     controller · service · entity · dtos, one folder per domain
  src/common/               guards, decorators, filters, enums
  src/database/             data source, migrations, seed + its fixtures
  test/unit  test/e2e
admin/ · student/
  app/pages/                one file per screen
  app/queries/              TanStack Query hooks, one per resource
  app/services/httpServices/  the API client layer
  app/components/           shared UI, guards, layouts
  app/redux/                auth/session state only — server data lives in queries/
  tests/                    vitest component + store tests
```

Both frontends share the same shape and the same design tokens; the admin console adds the
table/listing components the console screens need.
