/**
 * fk.fixture.ts — create a referenced row so a foreign key in a test payload points at something.
 *
 * WHY THIS EXISTS. The generated CRUD e2e suite sent a literal for every field, and for a uuid
 * foreign key that literal was the string `'test'`. Measured on agow: 102 of 245 tests failed with
 * `expected 201 "Created", got 400`, all of them `userId must be a UUID`. Two generators were
 * answering one question — scaffold-dto-from-entity read the ENTITY and emitted `@IsUUID()`, while
 * scaffold-crud-module read MODULE_PLAN (which types the same field `IsString`) and emitted the
 * payload — so the body was validated against a rule its author never saw.
 *
 * Making the literal a well-formed uuid does NOT fix it: the constraint is real, and the API maps
 * the violation to `400 A referenced resource does not exist`. The payload has to name a row that
 * exists, which means creating one, which means the fixture must satisfy THAT table's own required
 * columns and foreign keys — hence the recursion below.
 *
 * Everything here is driven by TypeORM metadata rather than a generated per-entity file, because
 * the shape of a table is not knowable at generation time and a per-entity fixture that guesses is
 * just the same defect with more files.
 */
import { DataSource, EntityMetadata } from 'typeorm';

/** Cache per DataSource+entity so one test body reuses a parent instead of inserting N of them. */
const cache = new WeakMap<DataSource, Map<string, string>>();

function findMeta(dataSource: DataSource, nameOrTable: string): EntityMetadata {
  const want = String(nameOrTable).toLowerCase().replace(/[^a-z0-9]/g, '');
  const meta = dataSource.entityMetadatas.find((m) => {
    const n = m.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const t = m.tableName.toLowerCase().replace(/[^a-z0-9]/g, '');
    // Accept the singular/plural pair too — MODULE_PLAN says `Users`, the entity class may be `User`.
    return n === want || t === want || n + 's' === want || want + 's' === n || t + 's' === want || want + 's' === t;
  });
  if (!meta) {
    throw new Error(
      `ensureRow: no entity registered for '${nameOrTable}'. Known: ${dataSource.entityMetadatas.map((m) => m.name).join(', ')}`,
    );
  }
  return meta;
}

/**
 * Insert a minimal valid row for `nameOrTable` and return its id.
 *
 * Fills every column the table REQUIRES — non-nullable, no default, not generated, not a timestamp
 * the ORM manages — and recurses into required foreign keys. `depth` bounds a cyclic schema rather
 * than overflowing the stack.
 */
export async function ensureRow(
  dataSource: DataSource,
  nameOrTable: string,
  overrides: Record<string, unknown> = {},
  depth = 0,
): Promise<string> {
  const meta = findMeta(dataSource, nameOrTable);
  const key = meta.name;
  let perDs = cache.get(dataSource);
  if (!perDs) { perDs = new Map(); cache.set(dataSource, perDs); }
  if (!Object.keys(overrides).length && perDs.has(key)) {
    const cached = perDs.get(key) as string;
    // The suite truncates between tests, so a cached id can be stale. Verify before reusing.
    const still = await dataSource.getRepository(meta.target).count({ where: { id: cached } as never });
    if (still > 0) return cached;
    perDs.delete(key);
  }
  if (depth > 5) throw new Error(`ensureRow: foreign key chain deeper than 5 at '${key}' — cyclic schema?`);

  const stamp = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
  const row: Record<string, unknown> = { ...overrides };
  for (const col of meta.columns) {
    if (col.isNullable || col.isGenerated || col.isPrimary) continue;
    if (col.isCreateDate || col.isUpdateDate || col.isDeleteDate || col.isVersion) continue;
    if (col.default !== undefined && col.default !== null) continue;
    if (Object.prototype.hasOwnProperty.call(row, col.propertyName)) continue;

    const rel = col.relationMetadata;
    if (rel) {
      row[col.propertyName] = await ensureRow(dataSource, rel.inverseEntityMetadata.name, {}, depth + 1);
      continue;
    }
    const t = String(col.type ?? '').toLowerCase();
    const enumValues = col.enum as ReadonlyArray<string | number> | undefined;
    if (enumValues && enumValues.length) row[col.propertyName] = enumValues[0];
    else if (t.includes('bool')) row[col.propertyName] = false;
    else if (t.includes('int') || t.includes('numeric') || t.includes('decimal') || t.includes('float') || t.includes('double') || t === 'number') row[col.propertyName] = 0;
    else if (t.includes('date') || t.includes('time')) row[col.propertyName] = new Date();
    else if (t.includes('json')) row[col.propertyName] = {};
    else if (/email/i.test(col.propertyName)) row[col.propertyName] = `${col.propertyName}-${stamp}@test.com`;
    else {
      const base = `${col.propertyName}-${stamp}`;
      const len = typeof col.length === 'string' ? parseInt(col.length, 10) : (col.length as number | undefined);
      row[col.propertyName] = len && len > 0 ? base.slice(-len) : base;
    }
  }

  const saved = (await dataSource.getRepository(meta.target).save(row as never)) as unknown as Record<string, unknown>;
  const id = String(saved.id ?? '');
  if (!Object.keys(overrides).length) perDs.set(key, id);
  return id;
}
