/**
 * AdminAuthLayout.tsx — chrome for the admin sign-in surface (design
 * ADM-00-login: a single centered auth card on a muted canvas, no sidebar or
 * topbar). Declared as its own layout in PROJECT_PRD_ROLES.md so the admin
 * login route can be nested under it once the page exists (wired by the
 * downstream screen-generation nodes).
 *
 * Guest-only enforcement is applied by the route guard that nests this layout,
 * not by the layout itself — keeping this file purely presentational.
 *
 * RULE-F3: admin auth chrome is separate from the admin console chrome.
 */
import { Outlet, Link } from 'react-router';
import { useTranslation } from 'react-i18next';

export default function AdminAuthLayout() {
  const { t } = useTranslation('common');

  return (
    <div className="grid min-h-screen place-items-center bg-muted px-4" data-testid="admin-auth-layout">
      <div className="w-full max-w-md">
        <Link
          to="/admin/login"
          className="mb-6 flex items-center justify-center text-xl font-bold"
          data-testid="admin-auth-logo"
        >
          {t('brand.name')}
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
