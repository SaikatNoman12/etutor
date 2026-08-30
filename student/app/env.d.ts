/// <reference types="vite/client" />

/**
 * env.d.ts — typed `import.meta.env` for Vite.
 *
 * Add project-specific VITE_* vars here as you introduce them. Keys must
 * start with VITE_ to be exposed to the client (Vite convention).
 */
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_DEFAULT_LOCALE?: 'en' | 'ko' | 'vi' | 'ru';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
