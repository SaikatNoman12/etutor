/**
 * The console chrome: sidebar navigation, a top bar naming who is signed in,
 * and the main region.
 *
 * The sidebar shipped with nothing in it but the generator's own
 * __ADMIN_NAV_ITEMS__ placeholder comment, which was never filled in. So the console had nine screens and
 * an empty sidebar: /admin/courses, /admin/orders and the rest were reachable
 * only by typing the URL.
 *
 * RULE-F3 (role-based layout separation): the console gets its own layout,
 * distinct from the student site's.
 */
import { useEffect, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '~/hooks/useAppSelector';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { logout } from '~/services/httpServices/authService';
import { authSlice } from '~/redux/features/authSlice';
import { user_role } from '~/enums/user-role.enum';
import {
  BookOpen,
  FolderTree,
  GraduationCap,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Ticket,
  Users,
  X,
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
  const location = useLocation();
  const dispatch = useAppDispatch();
  // The sidebar is `hidden md:flex`, and the ☰ button next to it had no
  // handler — so on a phone the console had no navigation at all and its eight
  // screens were URL-only. Same list, same component, revealed as a drawer.
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => { setNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
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

  const navLinks = (prefix: string) =>
    NAV.map(({ to, label, fallback, Icon, end }) => (
      <NavLink
        key={to}
        to={to}
        end={end}
        className={navCls}
        data-testid={`${prefix}-${to.replace(/^\/admin\/?/, '') || 'dashboard'}`}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t(label, { defaultValue: fallback })}
      </NavLink>
    ));

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
          {navLinks('admin-nav')}
        </nav>
        <div className="border-t p-4 text-sm text-muted-foreground" data-testid="admin-sidebar-user">
          {user?.email ?? t('actions.loading')}
        </div>
      </aside>

      {/* `min-w-0` on BOTH: a flex child defaults to `min-width: auto`, so this
          column grew to whatever its widest descendant wanted and took the page
          with it. A table 640px wide inside a scroll container still pushed the
          console to 738px in a 390px viewport — the container was clamping
          nothing because its parent was not clamped either. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-card px-4" data-testid="admin-topbar">
          <button
            type="button"
            onClick={() => setNavOpen((v) => !v)}
            aria-label={t('nav.menu')}
            aria-expanded={navOpen}
            className="et-press inline-flex h-[40px] w-[40px] items-center justify-center rounded-[var(--radius-md)] transition-colors hover:bg-muted md:hidden"
            data-testid="admin-topbar-menu"
          >
            {navOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
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
              className="et-press inline-flex min-h-[40px] cursor-pointer items-center rounded-[var(--radius-md)] px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              data-testid="admin-sign-out"
            >
              {t('profile.signOut', { defaultValue: 'Sign out' })}
            </button>
          </div>
        </header>

        {navOpen && (
          <div className="md:hidden" data-testid="admin-nav-drawer">
            <button
              type="button"
              aria-label={t('actions.close', { defaultValue: 'Close' })}
              onClick={() => setNavOpen(false)}
              className="et-scrim fixed inset-0 z-40 cursor-default bg-[rgb(22_22_29/0.4)]"
            />
            <nav className="et-drawer fixed inset-y-0 left-0 z-50 flex w-[82vw] max-w-[320px] flex-col gap-1 overflow-y-auto border-r bg-card p-3 shadow-[var(--shadow-3)]">
              <div className="mb-2 flex items-center justify-between px-1 pb-2">
                <Link to="/admin" className="text-lg font-bold text-primary">{t('brand.name')}</Link>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label={t('actions.close', { defaultValue: 'Close' })}
                  className="et-press inline-flex h-[40px] w-[40px] items-center justify-center rounded-[var(--radius-md)] hover:bg-muted"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              {navLinks('admin-drawer-nav')}
              <p className="mt-auto px-3 pt-4 text-xs text-muted-foreground">{user?.email ?? ''}</p>
            </nav>
          </div>
        )}

        {/* The gutter and the distance from the top bar are the LAYOUT's decision.
            Seven screens each declared their own — `px-6 py-8`, `p-[24px]`,
            `py-6`, and two with none at all, so the orders screen sat flush
            against the top bar while every other screen had 32px. */}
        <main className="min-w-0 flex-1 overflow-y-auto px-[16px] py-[24px] sm:px-[32px] sm:py-[32px]" data-testid="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
