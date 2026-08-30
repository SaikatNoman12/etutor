/**
 * RoleGuard.tsx — wraps routes that require specific role(s).
 *
 * Renders the outlet when the current user's role is in `allow`; otherwise
 * redirects to `redirectTo`. Designed to compose under AuthGuard:
 *
 *   layout("guards/AuthGuard.tsx", [
 *     layout("guards/RoleGuard.tsx", adminRoutes),  // wrapped with allow={['admin']}
 *   ])
 *
 * v54 evidence: LLM hallucinated `RequireRole` import — that's THIS component
 * under a different name. Standardize on RoleGuard.
 */
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '~/hooks/useAppSelector';
import type { Role } from '~/types/auth';

export interface RoleGuardProps {
  /** Roles that are allowed through. Single string accepted for convenience. */
  allow: Role | Role[];
  /** Where to send users whose role isn't allowed. Defaults to /. */
  redirectTo?: string;
}

export function RoleGuard({ allow, redirectTo = '/' }: RoleGuardProps) {
  const { user } = useAppSelector((s) => s.auth);
  const allowed = Array.isArray(allow) ? allow : [allow];

  if (!user || !allowed.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  return <Outlet />;
}
