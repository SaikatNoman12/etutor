import type { RouteConfigEntry } from "@react-router/dev/routes";
import { index } from "@react-router/dev/routes";

// The console has no public pages beyond its front door: `/` redirects into
// /admin, which the guard bounces to /admin/login when there is no session.
export const publicRoutes: RouteConfigEntry[] = [
  index("pages/adm-index.tsx"),
];
