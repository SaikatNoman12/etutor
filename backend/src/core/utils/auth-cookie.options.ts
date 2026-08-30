import { ConfigService } from "@nestjs/config";
import type { CookieOptions } from "express";

/**
 * How the auth cookies are scoped — one answer, used by everything that writes them.
 *
 * `SameSite=Strict` is correct only while the API and the site it serves share an
 * origin. Deployed, they do not: the apps sit on one host and this API on another,
 * which makes every request from them CROSS-SITE, and a Strict (or Lax) cookie is
 * simply not attached to those. The failure is silent and reads like the app's fault —
 * login answers 200 with a Set-Cookie the browser stores and then never sends, so the
 * very next call is a 401.
 *
 * `SameSite=None` is what a cross-site cookie needs, and browsers accept it only
 * alongside `Secure`, which needs HTTPS. So the value is read from the environment,
 * defaulting to the same-origin-safe behaviour, and a cross-site deployment asks for
 * None explicitly:
 *
 *   AUTH_COOKIE_SAMESITE=none      # cross-site (apps and API on different hosts)
 *   AUTH_COOKIE_SECURE=true        # implied by `none`; set it for HTTPS same-site too
 *
 * This lives in one place because the LOGOUT path needs the identical attributes. A
 * cross-site response that clears the cookie without `SameSite=None; Secure` is
 * rejected outright by the browser, so the old cookie survives and logout does not log
 * anyone out. Two call sites, one definition, no chance of them disagreeing.
 */
export function authCookieOptions(config: ConfigService): CookieOptions {
  const isProduction = config.get<string>("MODE") === "PROD";
  const configured = String(
    config.get<string>("AUTH_COOKIE_SAMESITE") ?? "",
  ).toLowerCase();
  const sameSite: "strict" | "lax" | "none" =
    configured === "none" || configured === "lax" || configured === "strict"
      ? configured
      : isProduction
        ? "strict"
        : "lax";
  // A cookie the browser will reject is worse than no cookie: it fails in the browser,
  // where no server log shows it. None implies Secure.
  const secure =
    sameSite === "none" ||
    String(config.get<string>("AUTH_COOKIE_SECURE") ?? "").toLowerCase() ===
      "true" ||
    isProduction;
  return { httpOnly: true, secure, sameSite, path: "/" };
}
