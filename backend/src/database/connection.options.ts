import * as path from "path";

/**
 * Where this app's database is — one answer, read by both callers.
 *
 * There were two: `data-source.ts` (the migration CLI) honoured DATABASE_URL, and
 * `app.module.ts` (the running app) built its options from POSTGRES_* only. On a hosted
 * deployment, where the provider hands you one connection string, that split means the
 * migrations run against the real database while the app quietly connects to
 * `localhost:5432` and fails on boot — the two halves disagreeing about which database
 * this is.
 *
 * Precedence: DATABASE_URL (what every hosted Postgres gives you), then the discrete
 * POSTGRES_* / DB_* variables, then local development defaults.
 */
export type DbConnection =
  | { url: string; ssl?: { rejectUnauthorized: boolean } }
  | {
      host: string;
      port: number;
      username: string;
      password: string;
      database: string;
      ssl?: { rejectUnauthorized: boolean };
    };

/**
 * TLS. Hosted Postgres requires it; a local docker container does not offer it. Enable
 * it when asked (DATABASE_SSL=true), or infer it from a connection string that already
 * says so — `sslmode=require` in the URL is how Neon and most providers write it.
 *
 * `rejectUnauthorized: false` is deliberate and is what these providers document: they
 * terminate TLS at a proxy whose certificate does not chain to a root in Node's bundle,
 * so verification fails against a connection that is nonetheless encrypted. It disables
 * certificate verification, not encryption.
 */
function sslFor(url?: string): { rejectUnauthorized: boolean } | undefined {
  const asked = String(process.env.DATABASE_SSL ?? "").toLowerCase() === "true";
  const inUrl = !!url && /[?&]sslmode=(require|verify-ca|verify-full)/i.test(url);
  return asked || inUrl ? { rejectUnauthorized: false } : undefined;
}

export function buildDbConnection(
  get: (key: string) => string | undefined = (k) => process.env[k],
): DbConnection {
  const url = get("DATABASE_URL") || get("DB_URL");
  if (url) {
    const ssl = sslFor(url);
    return ssl ? { url, ssl } : { url };
  }
  const ssl = sslFor();
  const discrete = {
    host: get("POSTGRES_HOST") || get("DB_HOST") || "localhost",
    port: parseInt(get("POSTGRES_PORT") || get("DB_PORT") || "5432", 10),
    username:
      get("POSTGRES_USER") || get("DB_USERNAME") || get("DB_USER") || "postgres",
    password: get("POSTGRES_PASSWORD") || get("DB_PASSWORD") || "postgres",
    database:
      get("POSTGRES_DATABASE") || get("DB_DATABASE") || get("DB_NAME") || "app",
  };
  return ssl ? { ...discrete, ssl } : discrete;
}

/** Entity and migration globs, resolved from this file's location. */
export function buildDbPaths(dirname: string): {
  entities: string[];
  migrations: string[];
} {
  const src = path.resolve(dirname, "..");
  return {
    entities: [path.join(src, "modules/**/*.entity.{ts,js}")],
    migrations: [path.join(src, "database/migrations/*.{ts,js}")],
  };
}
