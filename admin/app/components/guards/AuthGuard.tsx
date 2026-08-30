/**
 * AuthGuard.tsx — wraps routes that require authentication.
 *
 * Renders the outlet for authenticated users; redirects to /login otherwise.
 * Uses the Redux `auth` slice (~/redux/features/authSlice) as the source of
 * truth for whether a session exists. If the slice is still loading, render
 * a passthrough <Outlet /> so the child page can show its own loading state.
 */
import { Navigate, Outlet, useLocation } from 'react-router';
import { useAppSelector } from '~/hooks/useAppSelector';
import type { ReactNode } from 'react';

export interface AuthGuardProps {
  /** Optional fallback while the auth slice is hydrating. */
  loading?: ReactNode;
  /** Redirect target for unauthenticated users. Defaults to /login. */
  redirectTo?: string;
}

export function AuthGuard({ loading = null, redirectTo = '/login' }: AuthGuardProps) {
  const { user, isAuthenticated, isLoading } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (isLoading) return <>{loading}</>;
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
