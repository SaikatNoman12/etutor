import { Link, NavLink, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "~/hooks/useAppSelector";
import { useAppDispatch } from "~/hooks/useAppDispatch";
import { logout } from "~/services/httpServices/authService";
import { authSlice } from "~/redux/features/authSlice";
import { ShoppingCart } from "lucide-react";

/**
 * The site's primary navigation.
 *
 * It used to be a logo, a language switcher and a "Sign in" link: twelve of the
 * app's fourteen screens were reachable only by typing their URL or by finding a
 * link buried in a page. A catalogue you cannot get back to from the course you
 * are reading is not a catalogue.
 *
 * Signed out, the bar offers the public catalogue and the two ways in. Signed in,
 * it offers what the session unlocks — and nothing that would 401.
 */
export default function Header() {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth?.user);

  const link =
    "text-[15px] text-[var(--c-body)] transition-colors hover:text-[var(--c-primary)]";
  const active = "text-[var(--c-primary)] font-semibold";
  const cls = ({ isActive }: { isActive: boolean }) =>
    isActive ? `${link} ${active}` : link;

  const signOut = async () => {
    try {
      await logout();
    } catch {
      // Clearing the cookie is best-effort; the local session goes either way.
    }
    // Without this the store still holds the user, so the bar keeps offering
    // "My learning" to someone who no longer has a session.
    dispatch(authSlice.actions.clearAuth());
    navigate("/signin");
  };

  return (
    <header className="border-b border-[var(--c-hairline)] bg-[var(--c-surface)]">
      <div className="container mx-auto flex h-16 items-center justify-between gap-[16px] px-4">
        <Link
          to="/"
          className="text-xl font-bold text-[var(--c-primary)]"
          data-testid="header-logo"
        >
          {t("brand.name")}
        </Link>

        <nav
          className="hidden items-center gap-[24px] md:flex"
          data-testid="header-nav"
        >
          <NavLink to="/" end className={cls} data-testid="header-nav-home">
            {t("nav.home")}
          </NavLink>
          <NavLink to="/courses" className={cls} data-testid="header-nav-courses">
            {t("nav.courses")}
          </NavLink>
          <NavLink to="/instructors" className={cls} data-testid="header-nav-instructors">
            {t("nav.instructors")}
          </NavLink>
          {user && (
            <>
              <NavLink to="/my-learning" className={cls} data-testid="header-nav-my-learning">
                {t("nav.myLearning")}
              </NavLink>
              <NavLink to="/orders" className={cls} data-testid="header-nav-orders">
                {t("nav.orders")}
              </NavLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-[16px]">
          {user ? (
            <>
              <NavLink
                to="/cart"
                className={cls}
                aria-label={t("nav.cart")}
                data-testid="header-nav-cart"
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </NavLink>
              <NavLink to="/profile" className={cls} data-testid="header-nav-profile">
                {t("nav.profile")}
              </NavLink>
              <button
                type="button"
                onClick={() => { void signOut(); }}
                className="cursor-pointer text-[15px] text-[var(--c-muted)] transition-colors hover:text-[var(--c-primary)]"
                data-testid="header-sign-out"
              >
                {t("profile.signOut", "Sign out")}
              </button>
            </>
          ) : (
            <>
              <Link to="/signin" className={link} data-testid="header-sign-in">
                {t("auth.signIn", "Sign in")}
              </Link>
              <Link
                to="/signup"
                className="inline-flex min-h-[40px] items-center justify-center rounded-[6px] bg-[var(--c-primary)] px-[20px] text-[15px] font-semibold text-[var(--c-on-primary)] transition-colors hover:bg-[var(--c-primary-active)]"
                data-testid="header-sign-up"
              >
                {t("auth.createAccount", "Create account")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
