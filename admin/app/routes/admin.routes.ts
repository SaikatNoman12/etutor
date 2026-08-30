import type { RouteConfigEntry } from "@react-router/dev/routes";

// Admin console routes — nested under AdminGuard + AdminLayout in routes.ts.
// Kept as a typed empty array so the guard/layout tree exists before the
// individual admin pages do; the downstream screen-generation nodes populate
// it (dashboard, courses, categories, users, orders, enrollments, coupons).
// Example once pages exist:
//   import { route, index } from "@react-router/dev/routes";
//   export const adminRoutes: RouteConfigEntry[] = [
//     index("pages/admin/dashboard.tsx"),
//     route("courses", "pages/admin/courses.tsx"),
//   ];
export const adminRoutes: RouteConfigEntry[] = [];
