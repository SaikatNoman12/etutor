/**
 * global-setup.ts — Jest globalSetup hook.
 *
 * Canonical template. Runs ONCE before all e2e suites. Configures
 * NODE_ENV=test and routes the DB to <database>_test if the developer hasn't
 * already overridden it via env. Suites then boot AppModule against the
 * test DB.
 */
export default async function globalSetup(): Promise<void> {
  process.env.NODE_ENV = 'test';

  // Route to a *_test database unless caller explicitly overrode it.
  // POSTGRES_DATABASE is what UnifiedConfig + scaffold .env use.
  if (!process.env.POSTGRES_DATABASE) {
    process.env.POSTGRES_DATABASE =
      process.env.DB_NAME || `${process.env.npm_package_name || 'app'}_test`;
  }

  // Reduce log noise — suites are run sequentially via --runInBand, so info
  // logging from the Nest bootstrap clutters Jest output.
  process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
}
