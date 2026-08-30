/**
 * GuestGuard.tsx — wraps routes that should only be visible to logged-out users.
 *
 * Used for /login, /register, /forgot-password. If the user is already
 * authenticated, redirect them to their role's home route instead of showing
 * the auth form again. Pairs with AuthGuard (which does the opposite).
 */
import { Navigate, Outlet } from 'react-router';
import { useAppSelector } from '~/hooks/useAppSelector';

export interface GuestGuardProps {
  /** Where to send users who are already logged in. Defaults to /. */
  redirectTo?: string;
}

export function GuestGuard({ redirectTo = '/' }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAppSelector((s) => s.auth);

  if (isLoading) return <Outlet />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}
