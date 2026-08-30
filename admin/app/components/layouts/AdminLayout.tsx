/**
 * The console chrome: sidebar navigation, a top bar naming who is signed in,
 * and the footer.
 *
 * The sidebar shipped with nothing in it but the generator's own
 * __ADMIN_NAV_ITEMS__ placeholder comment, which was never filled in. So the console had nine screens and
 * an empty sidebar: /admin/courses, /admin/orders and the rest were reachable
 * only by typing the URL.
 *
 * RULE-F3 (role-based layout separation): the console gets its own layout,
 * distinct from the student site's.
 */
import { Outlet, Link, NavLink, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { logout } from '~/services/httpServices/authService';
import { authSlice } from '~/redux/features/authSlice';
import { user_role } from '~/enums/user-role.enum';
import Footer from '~/components/layout/footer';
import {
  BookOpen,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  ReceiptText,
  Ticket,
  Users,
} from 'lucide-react';

/** One entry per console route. `end` on the dashboard so it is not marked
 *  active for every /admin/* path underneath it. */
const NAV = [
  { to: '/admin', label: 'admin.nav.dashboard', fallback: 'Dashboard', Icon: LayoutDashboard, end: true },
  { to: '/admin/courses', label: 'admin.nav.courses', fallback: 'Courses', Icon: BookOpen },
  { to: '/admin/categories', label: 'admin.nav.categories', fallback: 'Categories', Icon: FolderTree },
  { to: '/admin/users', label: 'admin.nav.users', fallback: 'Users', Icon: Users },
  { to: '/admin/orders', label: 'admin.nav.orders', fallback: 'Orders', Icon: ReceiptText },
  { to: '/admin/enrollments', label: 'admin.nav.enrollments', fallback: 'Enrolments', Icon: GraduationCap },
  { to: '/admin/coupons', label: 'admin.nav.coupons', fallback: 'Coupons', Icon: Ticket },
];

export default function AdminLayout() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth?.user);
  const roleLabel =
    user?.role === user_role.ADMIN
      ? t('roles.admin', { defaultValue: 'Admin' })
      : user?.role === user_role.INSTRUCTOR
        ? t('roles.instructor', { defaultValue: 'Instructor' })
        : user?.role === user_role.STUDENT
          ? t('roles.student', { defaultValue: 'Student' })
          : '';

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Clearing the cookie is best-effort; the local session goes either way.
    }
    dispatch(authSlice.actions.clearAuth());
    navigate('/admin/login');
  };

  const navCls = ({ isActive }: { isActive: boolean }) =>
    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ' +
    (isActive
      ? 'bg-primary/10 font-semibold text-primary'
      : 'text-muted-foreground hover:bg-muted hover:text-foreground');

  return (
    <div className="flex min-h-screen" data-testid="admin-layout">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex" data-testid="admin-sidebar">
        <div className="border-b p-4">
          <Link to="/admin" className="block text-xl font-bold text-primary" data-testid="admin-sidebar-logo">
            {t('brand.name')}
          </Link>
          <p className="text-xs text-muted-foreground">
            {t('footer.console', 'admin console')}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-2" data-testid="admin-sidebar-nav">
          {NAV.map(({ to, label, fallback, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={navCls}
              data-testid={`admin-nav-${to.replace(/^\/admin\/?/, '') || 'dashboard'}`}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(label, { defaultValue: fallback })}
            </NavLink>
          ))}
        </nav>
        <div className="border-t p-4 text-sm text-muted-foreground" data-testid="admin-sidebar-user">
          {user?.email ?? t('actions.loading')}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4" data-testid="admin-topbar">
          <button className="p-2 md:hidden" data-testid="admin-topbar-menu" aria-label={t('nav.menu')}>
            ☰
          </button>
          <div className="ml-auto flex items-center gap-4">
            <span className="text-sm text-muted-foreground" data-testid="admin-topbar-role">
              {/* The role travels as its numeric JWT claim, so rendering it directly put a
                  bare "99" in the console's top bar. Name it. */}
              {roleLabel}
            </span>
            <button
              type="button"
              onClick={() => { void signOut(); }}
              className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-primary"
              data-testid="admin-sign-out"
            >
              {t('profile.signOut', { defaultValue: 'Sign out' })}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" data-testid="admin-main">
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  );
}
