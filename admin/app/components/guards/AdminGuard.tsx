/**
 * AdminGuard.tsx — route-level guard for the admin console (manifest guard
 * `auth:admin`). Wraps the whole `/admin/*` tree in routes.ts:
 *
 *   layout('components/guards/AdminGuard.tsx', [
 *     layout('components/layouts/AdminLayout.tsx', adminRoutes),
 *   ])
 *
 * This is a DEFAULT export because React Router 7 `layout()` imports the
 * route module's default export as the component. The named AuthGuard /
 * RoleGuard primitives cannot be used as route modules directly (no default
 * export), so the auth + admin-role check is inlined here — the pattern the
 * auth-guards guide calls "inline RBAC in the protected layout".
 *
 * It waits for the session check to settle (authChecked / isLoading) before
 * redirecting, so a hard refresh does not flash a redirect while the auth
 * slice is still hydrating from GET /auth/me.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '~/hooks/useAppSelector';

export default function AdminGuard() {
  const { user, isAuthenticated, isLoading, authChecked } = useAppSelector((s) => s.auth);
  const location = useLocation();

  // Session still hydrating — render nothing rather than redirect prematurely.
  if (isLoading || !authChecked) return null;

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  // Stringify both sides so a number-vs-string role contract can't silently
  // pass a non-admin through (see auth-guards.md → "Role Contract").
  if (String(user.role) !== 'admin') {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet />;
}
