import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, GraduationCap, Mail } from "lucide-react";
import { useAppSelector } from "~/hooks/useAppSelector";

/**
 * The site footer.
 *
 * Dark, on purpose. A footer on the same warm ground as the page reads as the
 * page running out; a footer that changes register — ink ground, the brand in
 * colour against it, a call to action before the small print — reads as the
 * site closing deliberately. It also gives the page a bottom edge, which is
 * what a footer is for.
 *
 * Every link points at a route this app serves. A footer of plausible-looking
 * links to /about, /privacy and /careers looks more finished and is worse:
 * each one is a 404 the client will click.
 */
export default function Footer() {
  const { t } = useTranslation("common");
  const user = useAppSelector((s) => s.auth?.user);

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
      links: user
        ? [{ to: "/profile", label: t("nav.profile") }]
        : [
            { to: "/signin", label: t("auth.signIn", "Sign in") },
            { to: "/signup", label: t("auth.createAccount", "Create account") },
          ],
    },
  ];

  return (
    <footer className="mt-[64px] bg-[var(--c-ink)] text-white" data-testid="site-footer">
      {/* The closing call to action — one more chance to start, before the
          small print. Sits half over the footer's top edge so the two surfaces
          read as one composition rather than a box on a box. */}
      <div className="container mx-auto px-4">
        <div className="et-aurora relative -translate-y-[32px] overflow-hidden rounded-[var(--radius-xl)] border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.04)] p-[28px] shadow-[var(--shadow-3)] backdrop-blur-sm sm:p-[36px]">
          <div className="flex flex-col items-start justify-between gap-[20px] sm:flex-row sm:items-center">
            <div>
              <p className="m-0 mb-[6px] text-[12px] font-bold uppercase tracking-[1.2px] text-[#ffb08a]">
                {t("footer.ctaEyebrow", "Start today")}
              </p>
              <p
                className="m-0 text-[24px] font-extrabold leading-[1.15] tracking-[-0.02em] text-white sm:text-[30px]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {user
                  ? t("footer.ctaTitleMember", "Pick up where you left off.")
                  : t("footer.ctaTitle", "Learn something new this week.")}
              </p>
            </div>
            <Link
              to={user ? "/my-learning" : "/courses"}
              className="et-press et-sheen inline-flex min-h-[50px] shrink-0 items-center justify-center gap-[8px] rounded-[var(--radius-pill)] px-[26px] text-[15px] font-semibold text-white shadow-[var(--shadow-2)] transition-transform"
              style={{ background: "var(--grad-brand)" }}
              data-testid="footer-cta"
            >
              {user ? t("nav.myLearning") : t("auth.browseCourses", "Browse courses")}
              <ArrowRight className="h-[16px] w-[16px]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-[40px]">
        <div className="grid grid-cols-1 gap-[32px] md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="flex flex-col gap-[14px]">
            <Link to="/" className="inline-flex items-center gap-[10px] text-[22px] font-extrabold tracking-[-0.03em] text-white" style={{ fontFamily: "var(--font-display)" }}>
              <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[10px]" style={{ background: "var(--grad-brand)" }}>
                <GraduationCap className="h-[20px] w-[20px] text-white" aria-hidden="true" />
              </span>
              {t("brand.name")}
            </Link>
            <p className="m-0 max-w-[36ch] text-[14px] leading-[1.7] text-[rgb(255_255_255/0.62)]">
              {t("app.tagline", "Learn with experts, anytime, anywhere")}
            </p>
            <a
              href="mailto:support@etutor.test"
              className="inline-flex w-fit items-center gap-[8px] rounded-[var(--radius-pill)] border border-[rgb(255_255_255/0.12)] px-[14px] py-[8px] text-[13px] text-[rgb(255_255_255/0.8)] transition-colors hover:border-[rgb(255_255_255/0.35)] hover:text-white"
            >
              <Mail className="h-[14px] w-[14px]" aria-hidden="true" />
              support@etutor.test
            </a>
          </div>

          {columns.map((col) => (
            <nav key={col.heading} className="flex flex-col gap-[10px]">
              <p className="m-0 mb-[4px] text-[12px] font-bold uppercase tracking-[1.2px] text-[rgb(255_255_255/0.45)]">
                {col.heading}
              </p>
              {col.links.map((l) => (
                <Link
                  key={l.to + l.label}
                  to={l.to}
                  className="w-fit text-[15px] text-[rgb(255_255_255/0.78)] transition-colors hover:text-white"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="mt-[36px] flex flex-col items-center justify-between gap-[10px] border-t border-[rgb(255_255_255/0.1)] pt-[22px] text-[13px] text-[rgb(255_255_255/0.5)] sm:flex-row">
          <p className="m-0">
            © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights", "All rights reserved.")}
          </p>
          <p className="m-0">{t("footer.madeFor", "Built for people who like to learn.")}</p>
        </div>
      </div>
    </footer>
  );
}
