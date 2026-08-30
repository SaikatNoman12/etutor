import { Link } from "react-router";
import { useTranslation } from "react-i18next";

/**
 * The site footer.
 *
 * What shipped here was the starter kit's placeholder — a single centred line
 * reading "© React Starter Kit. All rights reserved." on a client demo, under
 * every page of a product called E-Tutor.
 *
 * Every link below points at a route this app actually serves. A footer full of
 * plausible-looking links to /about, /privacy and /careers looks more finished
 * and is worse: each one is a 404 a client will click.
 */
export default function Footer() {
  const { t } = useTranslation("common");

  const columns: Array<{ heading: string; links: Array<{ to: string; label: string }> }> = [
    {
      heading: t("footer.explore", "Explore"),
      links: [
        { to: "/", label: t("nav.home") },
        { to: "/courses", label: t("nav.courses") },
        { to: "/instructors", label: t("nav.instructors") },
      ],
    },
    {
      heading: t("footer.learning", "Learning"),
      links: [
        { to: "/my-learning", label: t("nav.myLearning") },
        { to: "/orders", label: t("nav.orders") },
        { to: "/cart", label: t("nav.cart") },
      ],
    },
    {
      heading: t("footer.account", "Account"),
      links: [
        { to: "/signin", label: t("auth.signIn", "Sign in") },
        { to: "/signup", label: t("auth.createAccount", "Create account") },
        { to: "/profile", label: t("nav.profile") },
      ],
    },
  ];

  return (
    <footer
      className="mt-[48px] border-t border-[var(--c-hairline)] bg-[var(--c-surface)]"
      data-testid="site-footer"
    >
      <div className="container mx-auto px-4 py-[48px]">
        <div className="grid grid-cols-1 gap-[32px] md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-[8px]">
            <Link to="/" className="text-xl font-bold text-[var(--c-primary)]">
              {t("brand.name")}
            </Link>
            <p className="max-w-[320px] text-[14px] leading-[1.6] text-[var(--c-muted)]">
              {t("app.tagline", "Learn with experts, anytime, anywhere")}
            </p>
            <p className="text-[14px] text-[var(--c-muted)]">
              {t("footer.contact", "Questions?")}{" "}
              <a
                href="mailto:support@etutor.test"
                className="text-[var(--c-link)] hover:underline"
              >
                support@etutor.test
              </a>
            </p>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} className="flex flex-col gap-[8px]">
              <p className="text-[14px] font-semibold text-[var(--c-ink)]">{col.heading}</p>
              {col.links.map((l) => (
                <Link
                  key={l.to + l.label}
                  to={l.to}
                  className="text-[14px] text-[var(--c-muted)] transition-colors hover:text-[var(--c-primary)]"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-[32px] border-t border-[var(--c-hairline)] pt-[24px]">
          <p className="text-center text-[13px] text-[var(--c-muted)]">
            © {new Date().getFullYear()} {t("brand.name")}.{" "}
            {t("footer.rights", "All rights reserved.")}
          </p>
        </div>
      </div>
    </footer>
  );
}
