/**
 * StudentLayout — the shell every StudentLayout screen in the design manifest
 * renders inside (home, courses, course detail, instructors, cart, checkout,
 * orders, my-learning, player, profile). Serves both the guest catalogue and
 * the authenticated student area; the top-right actions swap on auth state.
 *
 * RULE-F3: role-scoped shell, distinct from the guest AuthLayout. Shared chrome
 * (topbar + footer) lives here and nowhere else so no page re-implements it.
 * RULE-F13: the footer is rendered only on the routes the design gives it,
 * read from the generated design-chrome map.
 */
import { Outlet, Link, NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Search, ShoppingCart } from 'lucide-react';
import { useAppSelector } from '~/hooks/useAppSelector';
import { LanguageToggle } from '~/components/shared/LanguageToggle';
import { BOTTOMNAV_ROUTES, hasChrome } from '~/components/layouts/design-chrome';

const NAV_LINKS = [
  { to: '/', key: 'home', end: true },
  { to: '/courses', key: 'courses', end: false },
  { to: '/instructors', key: 'instructors', end: false },
  { to: '/my-learning', key: 'myLearning', end: false },
  { to: '/orders', key: 'orders', end: false },
] as const;

export default function StudentLayout() {
  const { t } = useTranslation('common');
  const user = useAppSelector((s) => s.auth?.user);
  const location = useLocation();
  const showFooter = hasChrome(BOTTOMNAV_ROUTES, location.pathname);

  return (
    <div className="flex min-h-screen flex-col" data-testid="student-layout">
      <header className="border-b bg-card" data-shell="topbar">
        {/* Utility nav row */}
        <div className="border-b">
          <div className="container mx-auto flex h-10 items-center gap-6 px-4">
            <nav className="flex items-center gap-6 text-sm" data-testid="student-nav">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  data-testid={`nav-${l.key}`}
                  className={({ isActive }) =>
                    isActive ? 'text-primary font-medium' : 'text-muted-foreground hover:text-primary'
                  }
                >
                  {t(`nav.${l.key}`)}
                </NavLink>
              ))}
            </nav>
            <span className="flex-1" />
            <NavLink
              to="/profile"
              data-testid="nav-profile"
              className={({ isActive }) =>
                isActive ? 'text-primary text-sm font-medium' : 'text-muted-foreground text-sm hover:text-primary'
              }
            >
              {t('nav.profile')}
            </NavLink>
          </div>
        </div>

        {/* Brand + search + actions row */}
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold" data-testid="student-logo">
            <GraduationCap className="size-6 text-primary" aria-hidden="true" />
            <span className="brand-name">{t('brand.name')}</span>
          </Link>

          <label className="relative ml-4 hidden max-w-md flex-1 items-center md:flex">
            <Search className="pointer-events-none absolute left-3 size-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="search"
              aria-label={t('actions.search')}
              placeholder={t('actions.search')}
              data-testid="topbar-search"
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </label>

          <span className="flex-1" />

          <LanguageToggle />

          <Link
            to="/cart"
            aria-label={t('nav.cart')}
            data-testid="topbar-cart"
            className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
          </Link>

          {user ? (
            <Link to="/profile" className="text-sm font-medium" data-testid="topbar-profile">
              {user.name ?? user.email}
            </Link>
          ) : (
            <span className="flex items-center gap-2">
              <Link
                to="/signup"
                data-testid="topbar-signup"
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-accent"
              >
                {t('auth.createAccount')}
              </Link>
              <Link
                to="/signin"
                data-testid="topbar-signin"
                className="inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                {t('auth.signIn')}
              </Link>
            </span>
          )}
        </div>
      </header>

      <main className="container mx-auto flex-1" data-shell="content" data-testid="student-main">
        <Outlet />
      </main>

      {showFooter ? (
        <footer className="border-t bg-card" data-shell="bottomnav" data-testid="student-footer">
          <div className="container mx-auto flex flex-col gap-2 px-4 py-8">
            <Link to="/" className="flex items-center gap-2 font-bold" data-testid="footer-brand">
              <GraduationCap className="size-5 text-primary" aria-hidden="true" />
              <span className="brand-name">{t('brand.name')}</span>
            </Link>
            <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
