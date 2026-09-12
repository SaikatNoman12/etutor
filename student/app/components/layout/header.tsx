import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "~/hooks/useAppSelector";
import { useAppDispatch } from "~/hooks/useAppDispatch";
import { logout } from "~/services/httpServices/authService";
import { authSlice } from "~/redux/features/authSlice";
import { Menu, ShoppingCart, X } from "lucide-react";

/**
 * The site's primary navigation.
 *
 * Signed out it offers the public catalogue and the two ways in; signed in it
 * offers what the session unlocks and nothing that would 401.
 *
 * Below `md` the links collapse into a drawer. They used to simply be hidden —
 * `hidden items-center gap-6 md:flex` with no other control — so on a phone the
 * bar was a logo and a button, and eleven of the site's routes were reachable
 * only by typing the URL. A responsive site is not one whose navigation
 * disappears at 390px.
 */
export default function Header() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth?.user);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the drawer on navigation: leaving it open over the page you just
  // asked for is the classic mobile-menu bug.
  useEffect(() => { setOpen(false); }, [location.pathname, location.search]);

  // A body that scrolls behind an open drawer is disorienting on touch.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // The bar earns a shadow only once there is content behind it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Clearing the cookie is best-effort; the local session goes either way.
    }
    dispatch(authSlice.actions.clearAuth());
    navigate("/signin");
  };

  type NavItem = { to: string; label: string; id: string; end?: boolean };
  const PUBLIC: NavItem[] = [
    // `end` only on "/", or every route under it marks Home as the current page.
    { to: "/", label: t("nav.home"), end: true, id: "home" },
    { to: "/courses", label: t("nav.courses"), id: "courses" },
    { to: "/instructors", label: t("nav.instructors"), id: "instructors" },
  ];
  const PRIVATE: NavItem[] = [
    { to: "/my-learning", label: t("nav.myLearning"), id: "my-learning" },
    { to: "/orders", label: t("nav.orders"), id: "orders" },
  ];
  const links = user ? [...PUBLIC, ...PRIVATE] : PUBLIC;

  const deskLink = ({ isActive }: { isActive: boolean }) =>
    `et-underline text-[15px] transition-colors ${
      isActive ? "font-semibold text-[var(--c-ink)]" : "text-[var(--c-body)] hover:text-[var(--c-primary-text)]"
    }`;
  const drawerLink = ({ isActive }: { isActive: boolean }) =>
    `rounded-[var(--radius-md)] px-[12px] py-[14px] text-[17px] transition-colors ${
      isActive
        ? "bg-[var(--c-primary-soft)] font-semibold text-[var(--c-primary-text)]"
        : "text-[var(--c-ink)] hover:bg-[var(--c-surface-soft)]"
    }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b border-[var(--c-hairline)] bg-[var(--c-surface)]/85 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-[var(--shadow-1)]" : ""
      }`}
    >
      <div className="container mx-auto flex h-16 items-center justify-between gap-[16px] px-4">
        <Link
          to="/"
          className="shrink-0 text-[22px] font-extrabold tracking-[-0.03em] text-[var(--c-primary)]"
          style={{ fontFamily: "var(--font-display)" }}
          data-testid="header-logo"
        >
          {t("brand.name")}
        </Link>

        <nav className="hidden items-center gap-[26px] md:flex" data-testid="header-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={deskLink} data-testid={`header-nav-${l.id}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-[10px] md:gap-[16px]">
          {user ? (
            <>
              <NavLink
                to="/cart"
                className="et-press rounded-[var(--radius-md)] p-[8px] text-[var(--c-body)] transition-colors hover:bg-[var(--c-surface-soft)] hover:text-[var(--c-primary-text)]"
                aria-label={t("nav.cart")}
                data-testid="header-nav-cart"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </NavLink>
              <NavLink to="/profile" className={`hidden md:inline-flex ${deskLink({ isActive: false })}`} data-testid="header-nav-profile">
                {t("nav.profile")}
              </NavLink>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                className="et-press hidden cursor-pointer text-[15px] text-[var(--c-muted)] transition-colors hover:text-[var(--c-primary-text)] md:inline-flex"
                data-testid="header-sign-out"
              >
                {t("profile.signOut", "Sign out")}
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className="hidden text-[15px] text-[var(--c-body)] transition-colors hover:text-[var(--c-primary-text)] md:inline-flex" data-testid="header-sign-in">
                {t("auth.signIn", "Sign in")}
              </Link>
              <Link
                to="/signup"
                className="et-press et-sheen hidden min-h-[42px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--c-primary)] px-[20px] text-[15px] font-semibold text-[var(--c-on-primary)] shadow-[var(--shadow-1)] transition-colors hover:bg-[var(--c-primary-active)] sm:inline-flex"
                data-testid="header-sign-up"
              >
                {t("auth.createAccount", "Create account")}
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={t("nav.menu")}
            aria-expanded={open}
            className="et-press inline-flex h-[42px] w-[42px] items-center justify-center rounded-[var(--radius-md)] text-[var(--c-ink)] transition-colors hover:bg-[var(--c-surface-soft)] md:hidden"
            data-testid="header-menu-toggle"
          >
            {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden" data-testid="header-drawer">
          <button
            type="button"
            aria-label={t("actions.close", "Close")}
            onClick={() => setOpen(false)}
            className="et-scrim fixed inset-0 top-16 z-40 cursor-default bg-[rgb(22_22_29/0.35)]"
          />
          <nav className="et-drawer relative z-50 flex flex-col gap-[4px] border-t border-[var(--c-hairline)] bg-[var(--c-surface)] px-4 py-[12px] shadow-[var(--shadow-2)]">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} className={drawerLink} data-testid={`drawer-nav-${l.id}`}>
                {l.label}
              </NavLink>
            ))}
            <div className="my-[8px] h-px bg-[var(--c-hairline)]" />
            {user ? (
              <>
                <NavLink to="/profile" className={drawerLink} data-testid="drawer-nav-profile">
                  {t("nav.profile")}
                </NavLink>
                <NavLink to="/cart" className={drawerLink} data-testid="drawer-nav-cart">
                  {t("nav.cart")}
                </NavLink>
                <button
                  type="button"
                  onClick={() => { void signOut(); }}
                  className="rounded-[var(--radius-md)] px-[12px] py-[14px] text-left text-[17px] text-[var(--c-muted)] transition-colors hover:bg-[var(--c-surface-soft)]"
                  data-testid="drawer-sign-out"
                >
                  {t("profile.signOut", "Sign out")}
                </button>
              </>
            ) : (
              <>
                <NavLink to="/signin" className={drawerLink} data-testid="drawer-sign-in">
                  {t("auth.signIn", "Sign in")}
                </NavLink>
                <Link
                  to="/signup"
                  className="et-press mt-[4px] inline-flex min-h-[48px] items-center justify-center rounded-[var(--radius-pill)] bg-[var(--c-primary)] px-[20px] text-[16px] font-semibold text-[var(--c-on-primary)]"
                  data-testid="drawer-sign-up"
                >
                  {t("auth.createAccount", "Create account")}
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
