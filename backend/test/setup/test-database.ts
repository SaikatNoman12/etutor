/**
 * test-database.ts — DB helpers shared across e2e specs.
 *
 * Canonical template. Copied by scaffold-test-setup. Do not modify per-project.
 *
 * Reads connection config from process.env using the same names the app's
 * UnifiedConfig uses (POSTGRES_HOST etc.). Tests should always run against
 * a dedicated DB (POSTGRES_DATABASE=<name>_test). cleanDatabase() truncates
 * every entity table — do NOT point this at a real database.
 */
import { DataSource } from 'typeorm';

/**
 * Truncate every entity table in dependency order. Use in `beforeEach` to
 * guarantee a clean slate between specs. Skipped silently if no entity
 * metadata is loaded.
 */
export async function cleanDatabase(dataSource: DataSource): Promise<void> {
  if (!dataSource?.isInitialized) return;
  const entities = dataSource.entityMetadatas;
  if (entities.length === 0) return;
  const tableNames = entities.map((e) => `"${e.tableName}"`).join(', ');
  // CASCADE handles FK constraints; RESTART IDENTITY resets sequences so
  // autoincrement primary keys (if any) don't drift across specs.
  await dataSource.query(`TRUNCATE ${tableNames} RESTART IDENTITY CASCADE`);
}

/**
 * Convenience: bulk-insert seed rows using TypeORM's repository .save() —
 * type-safe per entity. Pass `{Entity: [row1, row2, ...]}`.
 */
export async function seedDatabase(
  dataSource: DataSource,
  seeds: Record<string, unknown[]>,
): Promise<void> {
  for (const [entityName, rows] of Object.entries(seeds)) {
    if (!rows || rows.length === 0) continue;
    const meta = dataSource.entityMetadatas.find(
      (e) => e.name === entityName || e.tableName === entityName,
    );
    if (!meta) {
      throw new Error(`seedDatabase: entity '${entityName}' not registered`);
    }
    const repo = dataSource.getRepository(meta.target);
    await repo.save(rows as never[]);
  }
}
