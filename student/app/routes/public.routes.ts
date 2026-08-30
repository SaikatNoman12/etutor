import type { RouteConfigEntry } from "@react-router/dev/routes";
import { index } from "@react-router/dev/routes";

// Public (unauthenticated) routes — define your project's public pages here.
// Example:
//   import { route, index } from "@react-router/dev/routes";
//   export const publicRoutes: RouteConfigEntry[] = [
//     index("pages/home.tsx"),
//     route("about", "pages/public/about.tsx"),
//   ];
export const publicRoutes: RouteConfigEntry[] = [
  // "/" was declared as the guest home in the design contract but no index route
  // was registered, so "/" rendered the root layout with an empty <Outlet /> (blank
  // page). The home page component already exists (also wired at /s-01-home); mount
  // it at the index. Explicit id avoids colliding with the safety-net s-01-home entry
  // that reuses the same module.
  index("pages/s-01-home.tsx", { id: "public-home-index" }),
];
