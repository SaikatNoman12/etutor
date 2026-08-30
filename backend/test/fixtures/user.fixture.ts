/**
 * user.fixture.ts — user-creation helpers for e2e specs.
 *
 * Canonical template. Creates users directly in the DB (bypassing the signup
 * flow) so tests can set up arbitrary roles + states. LLM tests consume
 * these; do not author them per-project.
 *
 * The User entity is expected to exist at
 * `src/modules/users/entities/user.entity.ts` with at least these columns:
 *   - email: string
 *   - password: string (bcrypt-hashed)
 *   - role: string (RoleEnum)
 * Projects with a different shape can override the helper by passing extra
 * fields via `extras`.
 */
import bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';

export interface CreateTestUserInput {
  email: string;
  password?: string; // plaintext; will be bcrypted. defaults to 'TestPass123!'
  // Accepts string enum members like `RoleEnum.OPERATOR` (which TS treats
  // as the enum type, NOT plain string in strict mode). The fixture
  // stores whatever is passed and the DB column converts at insert time.
  // v99b evidence: 1 spec failed at `Type 'RoleEnum' is not assignable
  // to type 'string'` because the param was `role?: string`.
  role?: string | number | { toString(): string };
  extras?: Record<string, unknown>;
}

export interface CreatedTestUser {
  id: string;
  email: string;
  password: string; // plaintext, for use in loginAndGetCookie
  role: string;
}

/**
 * Create a user row directly via the User repository. Bypasses the signup
 * endpoint so tests don't have to chain HTTP calls just to seed an actor.
 *
 * Returns the plaintext password too, so the caller can immediately
 * `loginAndGetCookie(app, user.email, user.password)`.
 */
export async function createTestUser(
  dataSource: DataSource,
  input: CreateTestUserInput,
): Promise<CreatedTestUser> {
  const userMeta = dataSource.entityMetadatas.find(
    (m) => m.name === 'User' || m.tableName === 'users',
  );
  if (!userMeta) {
    throw new Error(
      `createTestUser: User entity not registered with the DataSource. Ensure src/modules/users/entities/user.entity.ts is imported transitively from AppModule.`,
    );
  }
  const repo = dataSource.getRepository(userMeta.target);
  const password = input.password ?? 'TestPass123!';
  const hash = await bcrypt.hash(password, 4); // low cost = fast tests

  // v67 fix: discover the password column name at runtime. v66 evidence:
  // hardcoded `password:` wrote to a non-existent column when the actual
  // entity used `passwordHash`, so users got created without a hash and
  // every login returned 401, cascading to 322/326 failed tests.
  const pwColCandidates = ['passwordHash', 'password_hash', 'password', 'pwd', 'hashedPassword'];
  const pwCol = pwColCandidates.find((n) => userMeta.columns.find((c) => c.propertyName === n)) || 'password';

  // v102 fix: discover the role column type. When the User entity stores
  // role as smallint/integer/numeric (common when MODULE_PLAN describes
  // roles as "0=foreign_worker, 1=company_staff, ..." and scaffold-
  // numeric-enum-doctor converts the column), string role names like
  // "admin" cause Postgres to reject the INSERT ("invalid input syntax
  // for type smallint: admin"). Map common string role names to the
  // canonical numeric codes BEFORE inserting.
  //
  // Without it, every e2e suite calling `createTestUser({ role: RoleEnum.admin })`
  // fails with `smallint: "admin"` — the enum's NAME reaching a numeric column.
  const roleCol = userMeta.columns.find((c) => c.propertyName === 'role');
  const roleColType = String(roleCol?.type ?? '').toLowerCase();
  const numericRoleColumn =
    roleColType.includes('int') ||
    roleColType.includes('smallint') ||
    roleColType.includes('numeric') ||
    roleColType === 'number';

  // Canonical role-name-to-numeric mapping. Covers the standard FSP-style
  // role codes (0=worker, 1=staff, 2=lead, 10=operator, 99=admin) plus
  // synonyms commonly used across LLM-emitted specs. Projects with a
  // different mapping can pass numeric role values directly.
  const STRING_TO_NUMERIC_ROLE: Record<string, number> = {
    foreign_worker: 0, user: 0, worker: 0,
    company_staff: 1, staff: 1,
    company_lead: 2, lead: 2, company_manager: 2, manager: 2,
    operator: 10, OPERATOR: 10,
    super_admin: 99, superadmin: 99, SUPER_ADMIN: 99, admin: 99,
  };

  // The DEFAULT role is the one the entity itself declares — `@Column({ type: 'int', default: 1 })`
  // reaches here as `roleCol.default`. Falling back to 0 assumed FSP's numbering, where 0 is a real
  // role; agow's roles start at MEMBER = 1 and it has no 0, so every fixture user was created with a
  // role its own PROJECT_AUTH does not define. STRING_TO_NUMERIC_ROLE below has the same problem and
  // is left as a last resort: it is a guess table, and the entity is not a guess.
  const roleDefault: string | number =
    roleCol?.default != null ? (roleCol.default as string | number) : numericRoleColumn ? 0 : 'user';

  let roleValue: string | number;
  if (input.role == null) {
    roleValue = roleDefault;
  } else if (typeof input.role === 'number') {
    roleValue = input.role;
  } else {
    const raw = String(input.role);
    if (numericRoleColumn) {
      if (/^\d+$/.test(raw)) roleValue = Number(raw);
      else if (raw in STRING_TO_NUMERIC_ROLE) roleValue = STRING_TO_NUMERIC_ROLE[raw];
      else {
        const lc = raw.toLowerCase();
        roleValue = lc in STRING_TO_NUMERIC_ROLE ? STRING_TO_NUMERIC_ROLE[lc] : 0;
      }
    } else {
      roleValue = raw;
    }
  }

  const row: Record<string, unknown> = {
    email: input.email,
    [pwCol]: hash,
    role: roleValue,
    ...(input.extras ?? {}),
  };

  // Fill every OTHER column the table requires.
  //
  // This fixture had been fixed twice by the same move — v67 discovered the password column at
  // runtime, v102 discovered the role column's type — and both times the COLUMN SET stayed the
  // three fields hardcoded above. A template cannot know a project's user table: agow's declares
  // `nickname` NOT NULL, so every call inserted a row Postgres rejected, and one missing column
  // produced `null value in column "nickname"` 336 times, failing 171 of 245 tests across 28 of
  // 51 suites. The suite was not broken in 28 ways; it was broken in one.
  //
  // So ask the metadata instead of guessing: anything non-nullable, without a default, that the
  // caller did not set, gets a synthesized value of the right type. Generated/primary/timestamp
  // columns are excluded — the ORM fills those.
  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const missingRelations: string[] = [];
  for (const col of userMeta.columns) {
    if (col.isNullable || col.isGenerated || col.isPrimary) continue;
    if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
    if (col.default !== undefined && col.default !== null) continue;
    if (Object.prototype.hasOwnProperty.call(row, col.propertyName)) continue;

    // A NOT NULL foreign key cannot be invented — any uuid we made up would violate the
    // constraint it is supposed to satisfy. Name it and let the caller pass it via `extras`,
    // which is a readable failure instead of a Postgres one.
    if (col.relationMetadata) { missingRelations.push(col.propertyName); continue; }

    const t = String(col.type ?? '').toLowerCase();
    const enumValues = col.enum as ReadonlyArray<string | number> | undefined;
    if (enumValues && enumValues.length) {
      row[col.propertyName] = enumValues[0];
    } else if (t.includes('bool')) {
      row[col.propertyName] = false;
    } else if (t.includes('int') || t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double') || t === 'number') {
      row[col.propertyName] = 0;
    } else if (t.includes('date') || t.includes('time')) {
      row[col.propertyName] = new Date();
    } else if (t.includes('json')) {
      row[col.propertyName] = {};
    } else {
      // Text-ish. Keep it inside the declared length so a varchar(20) does not trade one
      // constraint violation for another, and keep it unique per call for columns under a
      // UNIQUE index (nickname, phone, handle — all common on a user table).
      const base = `${col.propertyName}-${stamp}`;
      const len = typeof col.length === 'string' ? parseInt(col.length, 10) : (col.length as number | undefined);
      row[col.propertyName] = len && len > 0 ? base.slice(-len) : base;
    }
  }
  if (missingRelations.length) {
    throw new Error(
      `createTestUser: the user table requires foreign key(s) [${missingRelations.join(', ')}] that a fixture cannot invent. ` +
      `Create the referenced row(s) first and pass the id(s) via extras, e.g. createTestUser(ds, { email, extras: { ${missingRelations[0]}: someId } }).`,
    );
  }

  const saved = (await repo.save(row as never)) as unknown as Record<string, unknown>;
  return {
    id: String(saved.id ?? ''),
    email: input.email,
    password, // plaintext — caller logs in with this
    role: String(saved.role ?? row.role),
  };
}
