/**
 * Database seed. Reads the demo users and rows from
 * src/database/fixtures/seed.fixtures.yaml and upserts them into the entities,
 * with bcrypt-hashed passwords.
 *
 * Idempotent (find-by-identifier + update / create). Run via:
 *
 *   npm run seed
 *
 * The seed script is the SINGLE SOURCE OF TRUTH for test credentials.
 * Hardcoding emails/passwords elsewhere is prohibited (RULE-B3).
 *
 * Implementation note: self-contained DataSource (no import from app
 * module) — we connect via PG env vars directly. Entities auto-discovered
 * via glob so we don't have to wire imports per entity.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import { user_role } from 'src/common/enums/user-role.enum';

dotenvConfig();

interface RawFixtureUser {
  email?: string | null;
  password?: string;
  [k: string]: unknown;
}

interface RawFixtures {
  users?: Record<string, RawFixtureUser>;
}

function loadYaml(): { parse: (s: string) => unknown } {
  try {
    return require('yaml');
  } catch {
    // fall through to global resolution
  }
  const root = require('child_process').execSync('npm root -g', { encoding: 'utf-8' }).trim();
  return require(path.join(root, 'yaml'));
}

function findFixtures(): string {
  // FIXTURES_PATH wins, so a deployment can point the seed at its own data file.
  const envPath = process.env.FIXTURES_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;

  // Otherwise the backend's own copy. This used to scan for a fixtures file in a
  // sibling tooling directory outside the project, which meant `npm run seed` threw on
  // a fresh checkout of this repo alone: no catalogue, and no account to log in with.
  // The fixtures describe this application's demo data, so they live inside it.
  const candidates = [
    path.resolve(__dirname, 'fixtures/seed.fixtures.yaml'),
    path.resolve(process.cwd(), 'src/database/fixtures/seed.fixtures.yaml'),
    path.resolve(process.cwd(), 'dist/database/fixtures/seed.fixtures.yaml'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error(
    'seed fixtures not found. Expected src/database/fixtures/seed.fixtures.yaml, ' +
      'or set FIXTURES_PATH to a fixtures file.',
  );
}

// v189: coerce a fixture enum value that doesn't match the entity's enum members.
// Fixtures can carry NUMERIC role discriminators (role: 1/2/99) while the generated
// UserRole enum is string names (STUDENT/INSTRUCTOR/ADMIN) — inserting "1" into the
// string enum column fails ("invalid input value for enum users_role_enum: '1'") →
// 0 users seeded → login-proof 401. PROJECT_AUTH.yaml carries the canonical
// {name, value} role map; use it to translate value<->name so the seeded value
// matches the enum the column was actually built with.
// The role name <-> numeric-code map, read from the application's own enum.
//
// It used to be parsed out of a spec file kept OUTSIDE the project, which is not
// something a checkout of this repo has: the map silently came back null and a fixture
// written as `role: ADMIN` would reach a smallint column verbatim. UserRole is the same
// information, it ships with the code, and it cannot drift from the column it describes.
let __roleMapCache: { byValue: Record<string, string>; byName: Record<string, string> } | null | undefined;
function loadRoleMap(): { byValue: Record<string, string>; byName: Record<string, string> } | null {
  if (__roleMapCache !== undefined) return __roleMapCache;
  const byValue: Record<string, string> = {};
  const byName: Record<string, string> = {};
  for (const [name, value] of Object.entries(user_role)) {
    // A numeric TS enum is reverse-mapped, so Object.entries yields both
    // ['STUDENT', 1] and ['1', 'STUDENT']. Keep the name->value direction only.
    if (typeof value !== 'number') continue;
    byValue[String(value)] = name;
    byName[name] = String(value);
  }
  __roleMapCache = Object.keys(byValue).length ? { byValue, byName } : null;
  return __roleMapCache;
}
function coerceEnumValue(col: { enum?: unknown; type?: unknown }, v: unknown): unknown {
  if (v == null) return v;
  // v190: role stored as a NUMERIC discriminator column (int/smallint) — translate a
  // role NAME → its numeric code via PROJECT_AUTH.yaml. Without this a fixture
  // `role: SUPER_ADMIN` is written verbatim into an int column → Postgres rejects it
  // ("invalid input syntax for integer") → 0 users seeded → login-proof 401. The
  // enum-column path below handles the inverse (numeric value → enum name).
  const colType = String((col && col.type) || '');
  const isNumericCol =
    (col && col.type === Number) ||
    /^(int|integer|smallint|bigint|numeric|decimal|float|double)$/i.test(colType);
  if (isNumericCol && typeof v === 'string' && !/^\d+$/.test(v)) {
    const rmNum = loadRoleMap();
    if (rmNum && rmNum.byName[v] != null) return Number(rmNum.byName[v]);
  }
  if (!col.enum) return v;
  const members = (Array.isArray(col.enum) ? col.enum : Object.values(col.enum as Record<string, unknown>)).map(String);
  if (members.includes(String(v))) return v; // already a valid member
  // (1) explicit role discriminator map from PROJECT_AUTH.yaml (role: 1->STUDENT)
  const rm = loadRoleMap();
  if (rm) {
    if (rm.byValue[String(v)] && members.includes(rm.byValue[String(v)])) return rm.byValue[String(v)];
    if (rm.byName[String(v)] && members.includes(rm.byName[String(v)])) return rm.byName[String(v)];
  }
  // (2) numeric discriminator used as a 0-based index into the enum members
  // (fixtures commonly encode status: 0 for the first/"active" state). Only when
  // v is an integer in range — otherwise leave as-is so a real mismatch surfaces.
  const n = typeof v === 'number' ? v : (/^\d+$/.test(String(v)) ? Number(v) : NaN);
  if (Number.isInteger(n) && n >= 0 && n < members.length) return members[n];
  return v; // no mapping — leave as-is
}

function buildDataSource(): DataSource {
  const isProd = process.env.NODE_ENV === 'production';
  // v93: read POSTGRES_* primary (matches app.module.ts + data-source.ts)
  // with DB_* as fallback for legacy / alternate naming conventions.
  // v92 evidence: seed silently fell through to 'postgres' admin DB when
  // env had POSTGRES_DATABASE=fsp but no DB_DATABASE → wrong DB → no users.
  return new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || process.env.DB_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
    username: process.env.POSTGRES_USER || process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DATABASE || process.env.DB_DATABASE || process.env.DB_NAME || 'postgres',
    synchronize: false,
    logging: false,
    // v93: path was '../../modules' (one level too deep). When seed.ts lives
    // at backend/src/database/seed.ts, __dirname = backend/src/database, so
    // '../modules' resolves to backend/src/modules. The old '../../modules'
    // pointed at backend/modules which doesn't exist → ZERO entities found
    // → seed logged "no User entity registered" → no users → auth 401.
    entities: [path.join(__dirname, '../modules/**/*.entity.{ts,js}')],
    ssl: isProd ? { rejectUnauthorized: false } : false,
  });
}

async function seedUsers(ds: DataSource, fixtures: RawFixtures): Promise<void> {
  if (!fixtures.users) {
    console.log('seed: no users: section in _fixtures.yaml — skipping');
    return;
  }

  // Find the entity by class name (substituted by scaffolder)
  const meta = ds.entityMetadatas.find((m) => m.name === 'User');
  if (!meta) {
    throw new Error('seed: could not locate User entity metadata. Did the entity file load?');
  }
  const repo = ds.getRepository(meta.target);

  const identifierField = 'email';
  // v154: resolve the password field to its ENTITY PROPERTY name (camelCase).
  // TypeORM create/update maps by propertyName, NOT databaseName — if MODULE_PLAN
  // carried the snake db name ('password_hash') the write silently drops, the
  // column stores NULL, and login's bcrypt.compare(pw, undefined) throws HTTP 500.
  // Match the configured field against either propertyName or databaseName, plus a
  // password*hash fallback, and always write under the camelCase propertyName.
  const __pwConfigured = 'passwordHash';
  const __pwCol =
    meta.columns.find((c) => c.propertyName === __pwConfigured || c.databaseName === __pwConfigured) ||
    meta.columns.find((c) => /password.*hash|pass_?hash|passwordHash/i.test(c.propertyName) || /password.*hash/i.test(c.databaseName));
  const passwordField = __pwCol ? __pwCol.propertyName : __pwConfigured;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [key, raw] of Object.entries(fixtures.users)) {
    if (!raw || !raw[identifierField] || !raw.password) {
      skipped++;
      continue;
    }
    const identifier = raw[identifierField] as string;
    const hashed = await bcrypt.hash(raw.password, 10);

    // Build the entity body: copy known scalar fields, drop seed-only keys.
    // v148: fixtures use snake_case (approval_status, phone_verified); the entity
    // PROPERTY is camelCase (approvalStatus). Match on EITHER propertyName or the
    // column databaseName, and always write under the camelCase propertyName.
    // Without this, snake_case business fields are silently dropped — e.g. an
    // instructor fixture's approval_status: APPROVED never lands, so the
    // instructor-detail endpoint 404s (it gates on approvalStatus === APPROVED).
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'password' || k === 'description') continue;
      const col = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
      const rel = meta.relations.find((r) => r.propertyName === k);
      if (col) body[col.propertyName] = coerceEnumValue(col, v);
      else if (rel) body[k] = v;
    }
    body[passwordField] = hashed;
    body[identifierField] = identifier;

    const existing = await repo.findOne({ where: { [identifierField]: identifier } });
    if (existing) {
      await repo.update({ id: (existing as { id: string }).id }, body);
      updated++;
      console.log('  ↻ updated ' + identifier + ' (' + key + ')');
    } else {
      await repo.save(repo.create(body));
      created++;
      console.log('  ✓ created ' + identifier + ' (' + key + ')');
    }
  }
  console.log('seed: users — created=' + created + ' updated=' + updated + ' skipped=' + skipped);
}

async function main(): Promise<void> {
  const yaml = loadYaml();
  const fixturesPath = findFixtures();
  console.log('seed: reading ' + fixturesPath);
  const fixtures = yaml.parse(fs.readFileSync(fixturesPath, 'utf-8')) as RawFixtures;

  const ds = buildDataSource();
  await ds.initialize();
  console.log('seed: DB connected (' + (ds.options.database || 'unknown') + ')');

  try {
    /* [scaffold-seed-script-multi-entity] redirected to multi-entity */ await seedAllWithUuidMap(ds, fixtures);
  } finally {
    await ds.destroy();
  }
  console.log('seed: done');
}

main().catch((err) => {
  console.error('seed: FAILED', err);
  process.exit(1);
});


// [scaffold-seed-script-multi-entity] — multi-entity seed extension
// Generated functions that seed companies, services, applications, documents
// in dependency order. Each function maps fixture keys to real UUIDs via
// uuidMap, so subsequent inserts can resolve FK references.

async function seedCategories(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["categories"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no categories: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Category";
  const tableCandidates = [targetName, "categories", "category"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("category") === 0 || m.name.toLowerCase().indexOf("category") === 0);
  if (!meta) { console.log('seed: no entity for categories — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["categories" + ':' + key] = id;
        if (__alias) { uuidMap["categories" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["categories" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed categories[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: categories — ' + created + ' created, ' + updated + ' updated');
}

async function seedCourses(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["courses"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no courses: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Course";
  const tableCandidates = [targetName, "courses", "course"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("course") === 0 || m.name.toLowerCase().indexOf("course") === 0);
  if (!meta) { console.log('seed: no entity for courses — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["courses" + ':' + key] = id;
        if (__alias) { uuidMap["courses" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["courses" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed courses[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: courses — ' + created + ' created, ' + updated + ' updated');
}

async function seedCourseSections(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["course_sections"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no course_sections: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "CourseSection";
  const tableCandidates = [targetName, "course_sections", "course_section"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("course_section") === 0 || m.name.toLowerCase().indexOf("course_section") === 0);
  if (!meta) { console.log('seed: no entity for course_sections — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["course_sections" + ':' + key] = id;
        if (__alias) { uuidMap["course_sections" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["course_sections" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed course_sections[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: course_sections — ' + created + ' created, ' + updated + ' updated');
}

async function seedLessons(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["lessons"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no lessons: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Lesson";
  const tableCandidates = [targetName, "lessons", "lesson"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("lesson") === 0 || m.name.toLowerCase().indexOf("lesson") === 0);
  if (!meta) { console.log('seed: no entity for lessons — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["lessons" + ':' + key] = id;
        if (__alias) { uuidMap["lessons" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["lessons" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed lessons[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: lessons — ' + created + ' created, ' + updated + ' updated');
}

async function seedCoupons(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["coupons"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no coupons: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Coupon";
  const tableCandidates = [targetName, "coupons", "coupon"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("coupon") === 0 || m.name.toLowerCase().indexOf("coupon") === 0);
  if (!meta) { console.log('seed: no entity for coupons — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["coupons" + ':' + key] = id;
        if (__alias) { uuidMap["coupons" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["coupons" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed coupons[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: coupons — ' + created + ' created, ' + updated + ' updated');
}

async function seedEnrollments(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["enrollments"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no enrollments: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Enrollment";
  const tableCandidates = [targetName, "enrollments", "enrollment"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("enrollment") === 0 || m.name.toLowerCase().indexOf("enrollment") === 0);
  if (!meta) { console.log('seed: no entity for enrollments — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["enrollments" + ':' + key] = id;
        if (__alias) { uuidMap["enrollments" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["enrollments" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed enrollments[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: enrollments — ' + created + ' created, ' + updated + ' updated');
}

async function seedOrders(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const sectionFixtures = ((fixtures as Record<string, any>)["seed_data"] || {})["orders"] as Record<string, Record<string, unknown>> | undefined;
  if (!sectionFixtures) { console.log('seed: no orders: section — skipping'); return; }
  // Find the entity for this section. Match by class name / table name, then
  // by table-name STEM (sports→sport_category) so generated entity names that
  // append a qualifier still resolve. Skip gracefully if no entity exists.
  const targetName = "Order";
  const tableCandidates = [targetName, "orders", "order"];
  const meta = ds.entityMetadatas.find(m =>
    m.name === targetName || tableCandidates.includes(m.tableName))
    || ds.entityMetadatas.find(m => m.tableName.indexOf("order") === 0 || m.name.toLowerCase().indexOf("order") === 0);
  if (!meta) { console.log('seed: no entity for orders — skipping'); return; }
  const repo = ds.getRepository(meta.target as { new(): unknown });
  const columnNames = new Set(meta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, rawBody] of Object.entries(sectionFixtures)) {
    const rows = Array.isArray(rawBody) ? rawBody : [rawBody];
    for (const body of rows) {
      if (!body || typeof body !== 'object') continue;
      if (Object.values(body).every(v => v === null)) continue; // placeholder (e.g. guest)
      const inserted = { ...body } as Record<string, unknown>;
      let __alias: string | null = null;
      if (inserted.id != null && !(typeof inserted.id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(inserted.id as string))) { __alias = String(inserted.id); delete inserted.id; }
      for (const k of Object.keys(inserted)) {
        const v = inserted[k];
        if (typeof v === 'string' && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v) && (uuidMap[v] || uuidMap['users:' + v])) {
          // Only resolve aliases into uuid/FK columns. A literal-key column
          // (e.g. lesson.sport stores the string "TENNIS", which the sports
          // seeder also registers as an alias) must NOT be clobbered into a
          // 36-char uuid -> varchar overflow + broken key (v163 seed cascade).
          let __fk = meta.columns.find((c) => c.propertyName === k || c.databaseName === k);
          // A fixture names the RELATION, not its foreign key: `course: <slug>` under a
          // section, `section: <title>` under a lesson. Matching only the FK column name
          // (courseId / course_id) left that key unresolved, and the "drop fields that are
          // not real columns" pass below then deleted it — so the row inserted with a NULL
          // FK and died on the NOT NULL constraint. Every course_section and every lesson
          // in the delivery failed that way, leaving the syllabus empty while the seed
          // reported "done". Resolve a relation-named key into the column it owns.
          let __fkKey = k;
          if (!__fk) {
            const __rel = meta.relations.find((r) => r.propertyName === k && r.joinColumns && r.joinColumns.length === 1);
            if (__rel) { __fk = __rel.joinColumns[0]; __fkKey = __fk.propertyName; }
          }
          if (__fk && /uuid/.test(String(__fk.type).toLowerCase())) {
            inserted[__fkKey] = uuidMap[v] || uuidMap['users:' + v];
            if (__fkKey !== k) delete inserted[k];
          }
        }
      }
      // Inject implicit owner FK (e.g. documents grouped under a worker key)
      const ownerCol = meta.columns.find(c => /^(worker|user|owner)Id$/.test(c.propertyName) && !c.isNullable);
      if (ownerCol && (inserted[ownerCol.propertyName] === undefined || inserted[ownerCol.propertyName] === null)) {
        const owner = uuidMap['__owner__:' + key] || uuidMap['users:' + key];
        if (owner) inserted[ownerCol.propertyName] = owner;
      }
      // v148: remap snake_case fixture keys → camelCase entity props (approval_status
      // → approvalStatus) via the column databaseName, BEFORE dropping non-columns —
      // otherwise snake_case business fields are silently lost.
      const __dbToProp = new Map(meta.columns.map(c => [c.databaseName, c.propertyName]));
      for (const k of Object.keys(inserted)) {
        const __p = __dbToProp.get(k);
        if (__p && !columnNames.has(k)) { inserted[__p] = inserted[k]; delete inserted[k]; }
      }
      // Drop fields that aren't real columns on the entity
      for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
      for (const __ec of meta.columns) {
        if ((__ec as { enum?: unknown }).enum && inserted[__ec.propertyName] != null) {
          inserted[__ec.propertyName] = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        }
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        const pn = col.propertyName;
        if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
        const t = String(col.type).toLowerCase();
        if (/char|text|varying/.test(t)) {
          let ph = 'seed-' + pn;
          if (col.length) ph = ph.slice(0, Number(col.length));
          inserted[pn] = ph;
        } else if (/bool/.test(t)) inserted[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
        else if (/time|date/.test(t)) inserted[pn] = new Date();
        else if (/json/.test(t)) inserted[pn] = {};
        else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
        // uuid / unknown: leave unset — cannot safely invent
      }
      const __uniqCols: string[] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of meta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      // COMPOSITE uniques too. Only single-column ones were considered, so an entity whose
      // identity is a PAIR — an enrollment is one (user, course) — never matched an
      // existing row and the seeder tried to insert it again on every run, failing on the
      // constraint. Re-running a seed is normal; it must not report failures for rows that
      // are already exactly right.
      const __uniqPairs: string[][] = [];
      for (const __ix of meta.indices) if (__ix.isUnique && __ix.columns.length > 1) __uniqPairs.push(__ix.columns.map((c) => c.propertyName));
      for (const __uq of meta.uniques) if (__uq.columns.length > 1) __uniqPairs.push(__uq.columns.map((c) => c.propertyName));
      const __registerRefs = (id: string) => {
        uuidMap["orders" + ':' + key] = id;
        if (__alias) { uuidMap["orders" + ':' + __alias] = id; uuidMap[__alias] = id; }
        for (const [bk, bv] of Object.entries(body as Record<string, unknown>)) {
          if (typeof bv === 'string' && /Id$/.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) uuidMap[bv] = id;
          // `code|slug|key` NAME this row. `category`/`sport`/`type` do not — they POINT
          // at another row, and registering one as this row's alias hands the pointer's
          // name to the wrong table: seeding the first course with `category: development`
          // rewrote uuidMap['development'] from the category's id to the COURSE's id, so
          // every later course in that category resolved its category to a course and died
          // on the foreign key. One course per category passed, the rest failed — which is
          // to say the bug was invisible until a catalogue had two courses in a category.
          //
          // And first writer wins: a global alias is claimed by the entity that owns the
          // name, not overwritten by whoever happens to be seeded last.
          if (typeof bv === 'string' && /^(code|slug|key)$/i.test(bk) && !/^[0-9a-f]{8}-/.test(bv)) { if (uuidMap[bv] === undefined) uuidMap[bv] = id; uuidMap["orders" + ':' + bv] = id; }
        }
      };
      try {
        let __existing: { id?: string } | null = null;
        for (const __uc of __uniqCols) {
          if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
            __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (!__existing) {
          for (const __pair of __uniqPairs) {
            if (!__pair.every((c) => inserted[c] !== undefined && inserted[c] !== null)) continue;
            const __where: Record<string, unknown> = {};
            for (const c of __pair) __where[c] = inserted[c];
            __existing = await repo.findOne({ where: __where } as object) as { id?: string } | null;
            if (__existing) break;
          }
        }
        if (__existing && __existing.id) {
          __registerRefs(__existing.id);
          // Actually write the fixture's fields onto the row. This branch used to only
          // register the id and count it as "updated" while writing nothing, so the seed
          // was insert-only: on a database that already had the row, any field ADDED to
          // the fixture afterwards never landed. Adding course thumbnails, category icons
          // and instructor avatars changed nothing on an existing database and the log
          // still said "updated" — the demo came up with images on the new rows only.
          await repo.save(repo.create({ ...(inserted as object), id: __existing.id } as object));
          updated++;
        } else {
          const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
          if (saved && saved.id) __registerRefs(saved.id);
          created++;
        }
      } catch (e) {
        console.warn('  seed orders[' + key + '] failed: ' + (e as Error).message);
      }
    }
  }
  console.log('seed: orders — ' + created + ' created, ' + updated + ' updated');
}


// v-fix: ensure a NOT NULL FK target row exists and return its id (PRD-agnostic).
// A uuid/int FK cannot be satisfied with a placeholder (referential integrity), so
// find an existing referenced row — or create a minimal one, recursively filling ITS
// required scalar + FK columns — and return its id. Without this a user fixture that
// omits a required relation (members' NOT NULL country_code_id) fails to insert.
async function __ensureRef(ds: DataSource, targetMeta: any, depth = 0): Promise<unknown> {
  const repo = ds.getRepository(targetMeta.target);
  try {
    const rows = await repo.find({ take: 1 });
    if (rows && rows[0] && (rows[0] as { id?: unknown }).id != null) return (rows[0] as { id?: unknown }).id;
  } catch { /* fall through to create */ }
  if (depth > 3) return null;
  const isJoinCol = (pn: string) => targetMeta.relations.some((r: any) => (r.joinColumns || []).some((jc: any) => jc.propertyName === pn));
  const body: Record<string, unknown> = {};
  for (const col of targetMeta.columns) {
    if (col.isPrimary || col.isNullable) continue;
    if (col.default !== undefined && col.default !== null) continue;
    if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
    if (isJoinCol(col.propertyName)) continue;
    const pn = col.propertyName; const t = String(col.type).toLowerCase();
    if ((col as { enum?: unknown }).enum) { const em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (em.length) body[pn] = em[0]; }
    else if (/char|text|varying/.test(t)) { let ph = 'seed-' + pn; if (col.length) ph = ph.slice(0, Number(col.length)); body[pn] = ph; }
    else if (/bool/.test(t)) body[pn] = false;
    else if (/int|numeric|decimal|float|double|real|money/.test(t)) body[pn] = 0;
    else if (/time|date/.test(t)) body[pn] = new Date();
    else if (/json/.test(t)) body[pn] = {};
  }
  for (const rel of targetMeta.relations) {
    if (rel.isNullable) continue;
    if (rel.relationType !== 'many-to-one' && rel.relationType !== 'one-to-one') continue;
    const jc = (rel.joinColumns || [])[0];
    if (!jc || body[jc.propertyName] != null) continue;
    const refId = await __ensureRef(ds, rel.inverseEntityMetadata, depth + 1);
    if (refId != null) body[jc.propertyName] = refId;
  }
  try { const saved = await repo.save(repo.create(body as object)) as { id?: unknown }; return saved && saved.id != null ? saved.id : null; }
  catch (e) { console.warn('  seed __ensureRef(' + targetMeta.name + ') failed: ' + (e as Error).message); return null; }
}

// Patched user seeder that also resolves companyId fixture-key references.
async function seedUsersWithUuidMap(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  if (!fixtures.users) { console.log('seed: no users: section — skipping'); return; }
  // Resolve the AUTH entity the login endpoint authenticates against: the name
  // the base seedUsers() used (build-time), then User/users, then any entity with
  // BOTH an email and a password-hash column (PRD-agnostic runtime fallback).
  const userMeta =
    ds.entityMetadatas.find(m => m.name === 'User') ||
    ds.entityMetadatas.find(m => m.name === 'User' || m.tableName === 'users') ||
    ds.entityMetadatas.find(m => m.columns.some(c => /^email$/i.test(c.propertyName) || /^email$/i.test(c.databaseName)) && m.columns.some(c => /password.?hash/i.test(c.propertyName) || /password.?hash/i.test(c.databaseName)));
  if (!userMeta) { console.log('seed: no auth/User entity registered'); return; }
  console.log('seed: auth entity = ' + userMeta.name + ' (table ' + userMeta.tableName + ')');
  const repo = ds.getRepository(userMeta.target as { new(): unknown });
  const columnNames = new Set(userMeta.columns.map(c => c.propertyName));
  let created = 0, updated = 0;
  for (const [key, body] of Object.entries(fixtures.users)) {
    if (!body || typeof body !== 'object') continue;
    if (Object.values(body).every(v => v === null)) continue;
    // v114: skip non-account placeholder users (e.g. `guest`) — a null email
    // can't satisfy the NOT NULL/unique email column and isn't a real login.
    if ((body as Record<string, unknown>).email == null) { console.log('seed: users[' + key + '] skipped (no email)'); continue; }
    const inserted: Record<string, unknown> = { ...body };
    // Resolve companyId ref → uuid
    if (typeof inserted.companyId === 'string') {
      const refKey = inserted.companyId as string;
      const resolved = uuidMap['companies:' + refKey] || uuidMap[refKey];
      if (resolved) inserted.companyId = resolved;
    }
    // Hash password if present
    if (typeof inserted.password === 'string') {
      inserted.passwordHash = await bcrypt.hash(inserted.password as string, 10);
      delete inserted.password;
    }
    // v148: remap snake_case fixture keys → camelCase entity properties before the
    // column filter. _fixtures.yaml uses snake_case (approval_status, phone_verified,
    // is_visible); the entity PROPERTY is camelCase (approvalStatus). Without this the
    // field is silently DROPPED → e.g. an instructor fixture\u2019s approval_status: APPROVED
    // never lands → the instructor-detail endpoint 404s (gates on approvalStatus===APPROVED)
    // even though the fixture declared it. Map via the column databaseName.
    const __u_dbToProp = new Map(userMeta.columns.map(c => [c.databaseName, c.propertyName]));
    for (const k of Object.keys(inserted)) {
      const __up = __u_dbToProp.get(k);
      if (__up && !columnNames.has(k)) { inserted[__up] = inserted[k]; delete inserted[k]; }
    }
    for (const k of Object.keys(inserted)) { if (!columnNames.has(k)) delete inserted[k]; }
    // v189: coerce enum column values (fixture numeric role/status -> entity enum member)
    // v-fix: fixture role taxonomy (member/ops_manager/super_admin) can differ from the
    // generated entity enum (Member/Partner/Admin/SuperAdmin). After normal coercion, if
    // the value still isn't a valid member, try a normalized (case/underscore-insensitive)
    // match, then fall back to the first enum member so the row ALWAYS inserts (login needs
    // email+password, not a perfect role) instead of throwing and dropping the whole user.
    for (const __ec of userMeta.columns) {
      const __enumDef = (__ec as { enum?: unknown }).enum;
      if (__enumDef && inserted[__ec.propertyName] != null) {
        let __v = coerceEnumValue(__ec as { enum?: unknown }, inserted[__ec.propertyName]);
        const __members = (Array.isArray(__enumDef) ? __enumDef : Object.values(__enumDef as Record<string, unknown>)).map(String);
        if (!__members.includes(String(__v))) {
          const __norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
          const __ci = __members.find(m => __norm(m) === __norm(String(__v)));
          __v = __ci !== undefined ? __ci : __members[0];
        }
        inserted[__ec.propertyName] = __v;
      }
    }
    // v114: fill required (NOT NULL, no default) columns the fixture omitted
    // (e.g. a user fixture missing `phone`) so the row still inserts. Login
    // only needs email+password; a placeholder phone is harmless test data.
    for (const col of userMeta.columns) {
      if (col.isPrimary || col.isNullable) continue;
      if (col.default !== undefined && col.default !== null) continue;
      if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
      const pn = col.propertyName;
      if (inserted[pn] !== undefined && inserted[pn] !== null) continue;
      const t = String(col.type).toLowerCase();
      if (/char|text|varying/.test(t)) { let ph = 'seed-' + pn; if (col.length) ph = ph.slice(0, Number(col.length)); inserted[pn] = ph; }
      else if (/bool/.test(t)) inserted[pn] = false;
      else if (/int|numeric|decimal|float|double|real|money/.test(t)) inserted[pn] = 0;
      else if (/time|date/.test(t)) inserted[pn] = new Date();
      else if (/json/.test(t)) inserted[pn] = {};
      else if ((col as { enum?: unknown }).enum) { const __em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (__em.length) inserted[pn] = __em[0]; }
    }
    // v-fix: satisfy NOT NULL FK/relation columns the fixture omitted (e.g. members'
    // country_code_id) by resolving/creating a referenced row — a uuid/int FK can't be
    // filled with a placeholder (referential integrity). Key "required" off the FK
    // COLUMN's nullability, NOT rel.isNullable: TypeORM defaults a relation to nullable
    // even when a paired explicit @Column({name}) on the same db column is NOT NULL.
    for (const rel of userMeta.relations) {
      if (rel.relationType !== 'many-to-one' && rel.relationType !== 'one-to-one') continue;
      const jc = (rel.joinColumns || [])[0];
      if (!jc) continue;
      const fkCol = userMeta.columns.find((c) => c.databaseName === jc.databaseName || c.propertyName === jc.propertyName);
      const required = fkCol ? !fkCol.isNullable : !rel.isNullable;
      if (!required) continue;
      const already = (fkCol && inserted[fkCol.propertyName] != null) || inserted[jc.propertyName] != null || inserted[rel.propertyName] != null;
      if (already) continue;
      const refId = await __ensureRef(ds, rel.inverseEntityMetadata);
      if (refId != null) inserted[fkCol ? fkCol.propertyName : jc.propertyName] = refId;
    }
    try {
      // v128: idempotent — find an existing user by a single-column unique
      // key DERIVED FROM ENTITY METADATA (PRD-agnostic, not a hardcoded
      // "email"). The old always-insert hit duplicate-key on re-seed AND
      // never registered the existing user id in uuidMap, so applications/
      // documents could not resolve their userId/workerId FK.
      const __uniqCols: string[] = [];
      for (const __ix of userMeta.indices) if (__ix.isUnique && __ix.columns.length === 1) __uniqCols.push(__ix.columns[0].propertyName);
      for (const __uq of userMeta.uniques) if (__uq.columns.length === 1) __uniqCols.push(__uq.columns[0].propertyName);
      if (__uniqCols.length === 0 && columnNames.has('email')) __uniqCols.push('email');
      let __existing: { id?: string } | null = null;
      for (const __uc of __uniqCols) {
        if (inserted[__uc] !== undefined && inserted[__uc] !== null) {
          __existing = await repo.findOne({ where: { [__uc]: inserted[__uc] } } as object) as { id?: string } | null;
          if (__existing) break;
        }
      }
      if (__existing && __existing.id) {
        // v148: _fixtures.yaml is the SOURCE OF TRUTH for test users — APPLY its
        // fields to the existing row (not just register the id). Without this a
        // re-seed never propagates fixture changes (e.g. approval_status: APPROVED
        // added later) → instructor stays unapproved → detail endpoints 404.
        try { await repo.update({ id: __existing.id } as object, inserted as object); } catch (e2) { /* keep going */ }
        uuidMap['users:' + key] = __existing.id;
        if (typeof (body as Record<string, unknown>).email === 'string') uuidMap['email:' + ((body as Record<string, unknown>).email as string)] = __existing.id;
        updated++;
      } else {
        const saved = await repo.save(repo.create(inserted as object)) as { id?: string };
        if (saved && saved.id) { uuidMap['users:' + key] = saved.id; if (typeof (body as Record<string, unknown>).email === 'string') uuidMap['email:' + ((body as Record<string, unknown>).email as string)] = saved.id; }
        created++;
      }
    } catch (e) {
      console.warn('  seed users[' + key + '] failed: ' + (e as Error).message);
    }
  }
  console.log('seed: users — ' + created + ' created, ' + updated + ' updated');
}

// v-fix: seed the `seed_data:` admin/member LIST demo rows (orders, withdrawals,
// notifications, reviews…). Without them every list/detail story hits an empty
// table → "renders rows" fails though the page + endpoint work. Each key maps to an
// entity by table name (plural/singular/stem tolerant); rows are filled like a user
// (enum-coerce with case + enum[0] fallback, required scalars, NOT NULL FKs via
// __ensureRef, owner FK pointed at a seeded member so member-scoped lists aren't empty).
async function seedSeedData(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>, handled: string[] = []): Promise<void> {
  const sd = (fixtures as Record<string, unknown>)['seed_data'] as Record<string, unknown[]> | undefined;
  if (!sd || typeof sd !== 'object') { console.log('seed: no seed_data section — skipping'); return; }
  // Skip what a dedicated seeder above already inserted. This generic pass ran over
  // EVERY seed_data section including the ones just handled, so it re-inserted each row
  // and logged the unique-constraint rejection: roughly 250 lines of "row failed" on a
  // seed that had in fact succeeded completely. It is only here for sections that have
  // no dedicated seeder.
  const skip = new Set(handled.map((h) => h.toLowerCase()));
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const singular = (s: string) => s.replace(/ies$/, 'y').replace(/s$/, '');
  const anyMemberId = Object.keys(uuidMap).filter((k) => k.indexOf('users:') === 0).map((k) => uuidMap[k])[0];
  let total = 0;
  for (const [resource, rows] of Object.entries(sd)) {
    if (!Array.isArray(rows) || !rows.length) continue;
    if (skip.has(resource.toLowerCase())) continue;
    const meta =
      ds.entityMetadatas.find((m) => norm(m.tableName) === norm(resource)) ||
      ds.entityMetadatas.find((m) => norm(m.tableName) === norm(singular(resource)) || norm(singular(m.tableName)) === norm(singular(resource))) ||
      ds.entityMetadatas.find((m) => norm(m.tableName).indexOf(norm(singular(resource))) === 0);
    if (!meta) { console.log('seed: seed_data[' + resource + '] — no entity match, skipping'); continue; }
    const repo = ds.getRepository(meta.target);
    const dbToProp = new Map(meta.columns.map((c) => [c.databaseName, c.propertyName] as [string, string]));
    let made = 0;
    for (const raw of rows) {
      if (!raw || typeof raw !== 'object') continue;
      const body: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
        if (k === 'id' && !(typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(v))) continue;
        const col = meta.columns.find((c) => c.propertyName === k || c.databaseName === k || dbToProp.get(k) === c.propertyName);
        if (!col) continue;
        let cv = coerceEnumValue(col as { enum?: unknown }, v);
        const ed = (col as { enum?: unknown }).enum;
        if (ed) {
          const mem = (Array.isArray(ed) ? ed : Object.values(ed as Record<string, unknown>)).map(String);
          if (!mem.includes(String(cv))) {
            const nz = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const ci = mem.find((m) => nz(m) === nz(String(cv)));
            cv = ci !== undefined ? ci : mem[0];
          }
        } else if (/int|smallint|numeric|decimal|float|double|real/.test(String(col.type).toLowerCase()) && typeof v === 'string' && !/^-?\d+(\.\d+)?$/.test(v)) {
          continue;
        }
        body[col.propertyName] = cv;
      }
      for (const col of meta.columns) {
        if (col.isPrimary || col.isNullable) continue;
        if (col.default !== undefined && col.default !== null) continue;
        if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
        if (meta.relations.some((r) => (r.joinColumns || []).some((jc) => jc.propertyName === col.propertyName))) continue;
        const pn = col.propertyName; if (body[pn] != null) continue; const t = String(col.type).toLowerCase();
        if ((col as { enum?: unknown }).enum) { const em = (Array.isArray((col as { enum?: unknown[] }).enum) ? (col as { enum: unknown[] }).enum : Object.values((col as { enum: object }).enum)).map(String); if (em.length) body[pn] = em[0]; }
        else if (/char|text|varying/.test(t)) { let ph = 'seed-' + pn; if (col.length) ph = ph.slice(0, Number(col.length)); body[pn] = ph; }
        else if (/bool/.test(t)) body[pn] = false;
        else if (/int|numeric|decimal|float|double|real|money/.test(t)) body[pn] = 0;
        else if (/time|date/.test(t)) body[pn] = new Date();
        else if (/json/.test(t)) body[pn] = {};
      }
      for (const rel of meta.relations) {
        if (rel.relationType !== 'many-to-one' && rel.relationType !== 'one-to-one') continue;
        const jc = (rel.joinColumns || [])[0]; if (!jc) continue;
        const fkCol = meta.columns.find((c) => c.databaseName === jc.databaseName || c.propertyName === jc.propertyName);
        if (!(fkCol ? !fkCol.isNullable : !rel.isNullable)) continue;
        const prop = fkCol ? fkCol.propertyName : jc.propertyName;
        if (body[prop] != null) continue;
        const ownerish = /^(member|user|owner|customer)/i.test(rel.propertyName) || /^(member|user|owner|customer)_?id$/i.test(prop);
        const refId = ownerish && anyMemberId ? anyMemberId : await __ensureRef(ds, rel.inverseEntityMetadata);
        if (refId != null) body[prop] = refId;
      }
      // Dedup on email: never insert a demo row whose email collides with an already-
      // seeded AUTH user — a members table without a unique-email constraint would gain a
      // passwordless duplicate that login's findOne({email}) could return → HTTP 401.
      const __emCol = meta.columns.find((c) => c.propertyName === 'email' || c.databaseName === 'email');
      if (__emCol && body[__emCol.propertyName]) {
        const __dup = await repo.findOne({ where: { [__emCol.propertyName]: body[__emCol.propertyName] } as object }).catch(() => null);
        if (__dup) { continue; }
      }
      try { await repo.save(repo.create(body as object)); made++; total++; }
      catch (e) { console.warn('  seed seed_data[' + resource + '] row failed: ' + (e as Error).message); }
    }
    if (made) console.log('seed: seed_data[' + resource + '] — ' + made + ' rows into ' + meta.tableName);
  }
  console.log('seed: seed_data — ' + total + ' demo rows total');
}

/**
 * Turn each order fixture's `items: [<course-slug>, ...]` into real order lines, then
 * make the order's money add up.
 *
 * seedOrders drops every fixture key that is not a column on `orders`, and `items` is a
 * relation, not a column — so the seeded orders had no lines and subtotal/total of 0.
 * Nothing failed: the admin order list rendered rows reading "0", every order detail
 * showed an empty table, and the dashboard's revenue figure was zero on a database that
 * was supposedly full of paid orders. For a demo that is the whole screen.
 *
 * Prices come from the seeded courses, and the discount from the named coupon, so the
 * arithmetic on screen is the arithmetic the application itself would produce.
 */
async function seedOrderItems(ds: DataSource, fixtures: RawFixtures): Promise<void> {
  const rows = ((fixtures as Record<string, any>)['seed_data'] || {})['orders'];
  if (!Array.isArray(rows) || !rows.length) return;

  const find = (needle: string) =>
    ds.entityMetadatas.find((m) => m.tableName === needle) ||
    ds.entityMetadatas.find((m) => m.tableName.replace(/_/g, '') === needle.replace(/_/g, ''));
  const orderMeta = find('orders');
  const itemMeta = find('order_items');
  const courseMeta = find('courses');
  const couponMeta = find('coupons');
  if (!orderMeta || !itemMeta || !courseMeta) return;

  const orderRepo = ds.getRepository(orderMeta.target);
  const itemRepo = ds.getRepository(itemMeta.target);
  const courseRepo = ds.getRepository(courseMeta.target);
  const couponRepo = couponMeta ? ds.getRepository(couponMeta.target) : null;

  let lines = 0, priced = 0;
  for (const raw of rows) {
    const fx = raw as Record<string, unknown>;
    const slugs = Array.isArray(fx.items) ? (fx.items as unknown[]).map(String) : [];
    if (!fx.order_number || !slugs.length) continue;

    const order = (await orderRepo.findOne({
      where: { orderNumber: String(fx.order_number) } as object,
    })) as Record<string, unknown> | null;
    if (!order) continue;

    // Idempotent: re-running the seed must not double the lines.
    await itemRepo.delete({ orderId: order.id } as object).catch(() => undefined);

    let subtotal = 0;
    for (const slug of slugs) {
      const course = (await courseRepo.findOne({ where: { slug } as object })) as Record<
        string,
        unknown
      > | null;
      if (!course) { console.warn('  seed order ' + fx.order_number + ': no course ' + slug); continue; }
      const unitPrice = Number(course.price ?? 0);
      subtotal += unitPrice;
      await itemRepo.save(
        itemRepo.create({
          orderId: order.id,
          courseId: course.id,
          titleSnapshot: String(course.title ?? slug),
          unitPrice,
          quantity: 1,
        } as object),
      );
      lines++;
    }

    // The discount the named coupon actually describes — percent or fixed amount.
    let discount = 0;
    if (fx.coupon && couponRepo) {
      const coupon = (await couponRepo.findOne({
        where: { code: String(fx.coupon) } as object,
      })) as Record<string, unknown> | null;
      if (coupon) {
        const value = Number(coupon.discountValue ?? 0);
        discount =
          Number(coupon.discountType) === 1
            ? Math.round(subtotal * (value / 100) * 100) / 100
            : Math.min(value, subtotal);
        (order as Record<string, unknown>).couponId = coupon.id;
      }
    }

    order.subtotal = Math.round(subtotal * 100) / 100;
    order.discountTotal = discount;
    order.total = Math.round((subtotal - discount) * 100) / 100;
    // A paid order that never recorded WHEN it was paid reads as a data bug on screen.
    if (Number(order.status) === 1 && !order.paidAt) order.paidAt = order.placedAt ?? new Date();
    await orderRepo.save(order as object);
    priced++;
  }
  console.log('seed: order items — ' + lines + ' line(s) across ' + priced + ' order(s)');
}

/**
 * Clear the syllabus of every course the fixture describes, so re-seeding rebuilds it
 * instead of appending a second copy.
 *
 * A course section has no natural unique key — its title repeats across courses by
 * design — so the "does this row already exist" check can never match one, and every
 * seed run inserted the whole syllabus again. Four runs left one course showing twelve
 * sections named "Getting started", three of them duplicates, which is what a client
 * would see on the course page. The fixture is the source of truth for demo content:
 * make the database match it rather than accumulate against it.
 */
async function resetCourseSyllabus(ds: DataSource, fixtures: RawFixtures): Promise<void> {
  const courses = ((fixtures as Record<string, any>)['seed_data'] || {})['courses'];
  if (!Array.isArray(courses) || !courses.length) return;
  const slugs = courses.map((c: Record<string, unknown>) => String(c.slug)).filter(Boolean);
  if (!slugs.length) return;

  const find = (t: string) => ds.entityMetadatas.find((m) => m.tableName === t);
  const courseMeta = find('courses');
  const sectionMeta = find('course_sections');
  const lessonMeta = find('lessons');
  if (!courseMeta || !sectionMeta) return;

  const rows = (await ds
    .getRepository(courseMeta.target)
    .createQueryBuilder('c')
    .select('c.id', 'id')
    .where('c.slug IN (:...slugs)', { slugs })
    .getRawMany()) as Array<{ id: string }>;
  if (!rows.length) return;
  const ids = rows.map((r) => r.id);

  // Lessons first: they point at the sections.
  if (lessonMeta) {
    await ds
      .getRepository(lessonMeta.target)
      .createQueryBuilder()
      .delete()
      .where('course_id IN (:...ids)', { ids })
      .execute()
      .catch(() => undefined);
  }
  await ds
    .getRepository(sectionMeta.target)
    .createQueryBuilder()
    .delete()
    .where('course_id IN (:...ids)', { ids })
    .execute()
    .catch(() => undefined);
}

// Multi-entity seed orchestrator. Replaces the original seedUsers call.
async function seedAllWithUuidMap(ds: DataSource, fixtures: RawFixtures): Promise<void> {
  const uuidMap: Record<string, string> = {};
  await seedUsersWithUuidMap(ds, fixtures, uuidMap);
  await seedCategories(ds, fixtures, uuidMap);
  await seedCourses(ds, fixtures, uuidMap);
  await resetCourseSyllabus(ds, fixtures);
  await seedCourseSections(ds, fixtures, uuidMap);
  await seedLessons(ds, fixtures, uuidMap);
  await seedCoupons(ds, fixtures, uuidMap);
  await seedEnrollments(ds, fixtures, uuidMap);
  await seedOrders(ds, fixtures, uuidMap);
  await seedSeedData(ds, fixtures, uuidMap, [
    'categories', 'courses', 'course_sections', 'lessons', 'coupons', 'enrollments', 'orders',
  ]);
  await seedOrderItems(ds, fixtures);
  await reassertFixtureUsers(ds, fixtures, uuidMap);
  console.log('seed: multi-entity done — ' + Object.keys(uuidMap).length + ' refs mapped');
}

// Auth users are the ONE thing the whole app depends on: without them every story,
// every gate probe and every manual check sees the logged-out UI. On a freshly wiped
// database (the e2e suite truncates), the first seed reports "users — N created" yet
// the rows are gone by the end of the run — a later pass in this same seed removes
// them, and only a SECOND seed run leaves the logins working. Rather than depend on
// pass ordering, re-assert the fixture users last and VERIFY, so one seed run is
// always enough and a regression fails loudly instead of silently shipping an app
// nobody can log into.
async function reassertFixtureUsers(ds: DataSource, fixtures: RawFixtures, uuidMap: Record<string, string>): Promise<void> {
  const wanted = Object.values((fixtures.users || {}) as Record<string, { email?: string }>)
    .map((u) => u && u.email).filter(Boolean) as string[];
  if (!wanted.length) return;
  const meta = ds.entityMetadatas.find((m) => m.name === 'User')
    || ds.entityMetadatas.find((m) => m.tableName === 'members' || m.tableName === 'users');
  if (!meta) return;
  const repo = ds.getRepository(meta.target);
  const present = async (): Promise<string[]> => {
    const rows = (await repo.find()) as Array<Record<string, unknown>>;
    return rows.filter((r) => r && r.email && r.passwordHash).map((r) => String(r.email));
  };
  let have = await present();
  const missing = wanted.filter((e) => !have.includes(e));
  if (missing.length) {
    console.log('seed: re-asserting ' + missing.length + ' fixture user(s) lost during seeding: ' + missing.join(', '));
    await seedUsersWithUuidMap(ds, fixtures, uuidMap);
    have = await present();
  }
  const stillMissing = wanted.filter((e) => !have.includes(e));
  if (stillMissing.length) {
    throw new Error('seed: fixture users missing after re-assert — ' + stillMissing.join(', '));
  }
  console.log('seed: verified ' + wanted.length + ' fixture login(s) present');
}

// Intercept the main flow: replace the original seedUsers(ds, fixtures)
// call with seedAllWithUuidMap. We do this by exporting a runMultiEntity
// function that the existing main() can call.
export { seedAllWithUuidMap };
