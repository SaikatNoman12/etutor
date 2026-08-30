/**
 * AdminGuard.tsx — route-level guard for the admin console (manifest guard
 * `auth:admin`). Wraps the whole `/admin/*` tree except the login page.
 *
 * DEFAULT export because React Router 7's `layout()` mounts a route module's
 * default export.
 *
 * Two things here were wrong for as long as this file existed, and both were
 * invisible because nothing had wired the guard into routes.ts:
 *
 *  1. It gated on `isLoading || !authChecked`. `authChecked` is monotonic —
 *     false until the first session check resolves, true forever after —
 *     but `isLoading` flips back on every later refetch, so a page that
 *     fetches on mount unmounts the guard's whole subtree, which remounts,
 *     which fetches again. ProtectedLayout carries the same scar.
 *  2. It compared `String(user.role) !== 'admin'`. The role travels as its
 *     numeric JWT claim (admin is 99), so that comparison is true for the
 *     admin too: wiring this guard up as written would have bounced every
 *     administrator to the login page they had just used.
 */
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '~/hooks/useAppSelector';
import { user_role } from '~/enums/user-role.enum';
import { PageSkeleton } from '~/components/shared/PageSkeleton';

/** Accept the role as the number it is, or as the string a JSON round-trip may leave. */
function isAdmin(role: unknown): boolean {
  return String(role) === String(user_role.ADMIN) || String(role).toLowerCase() === 'admin';
}

export default function AdminGuard() {
  const { user, authChecked } = useAppSelector((s) => s.auth);

  // Same reason as the student site's ProtectedLayout: `null` here is a blank
  // console for the length of the session check.
  if (!authChecked) return <PageSkeleton />;

  if (!user) {
    // `state` deliberately omitted. Passing `state={{ from: location.pathname }}`
    // builds a NEW object on every render, and <Navigate> re-runs its effect when
    // that prop changes — so the guard re-navigated on each render and React shut
    // it down with "Maximum update depth exceeded", leaving the console blank
    // rather than redirected. Nothing read the value.
    return <Navigate to="/admin/login" replace />;
  }
  if (!isAdmin(user.role)) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}
