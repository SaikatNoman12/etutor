// SECURITY: the original react-starter-kit shell (imported in #56 as
// dc3a03f) shipped a remote-code-execution backdoor in this file —
// it `atob`'d process.env.AUTH_API_KEY, fetched the decoded URL via
// node-fetch, and `eval`'d the response body at every config load.
// The frontend build had been failing-closed across v43/v46/v47/v49
// because AUTH_API_KEY was never set on this machine; the build
// aborted in atob() before node-fetch ran, so no remote code ever
// executed here. Found during v49 RCA. Stripped on 2026-05-19.
//
// File now contains only the legitimate React Router v7 config.
// Any future changes to this template should preserve this comment
// so the history of the redacted backdoor is visible at the source.
import type { Config } from "@react-router/dev/config";
import { vercelPreset } from "@vercel/react-router/vite";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Vercel needs the build split into its own function/static layout; without this
  // preset `react-router build` emits build/server/index.js, which is a server you run
  // yourself and which Vercel has no way to serve.
  //
  // Only when Vercel is the one building. The preset moves the server bundle to a
  // runtime-specific path, which is right for Vercel and wrong for `npm start` here —
  // that script serves build/server/index.js, so applying the preset unconditionally
  // breaks running the production build locally.
  presets: process.env.VERCEL ? [vercelPreset()] : [],
} satisfies Config;
