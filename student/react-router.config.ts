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

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
} satisfies Config;
