import { useTranslation } from "react-i18next";
import { GraduationCap, LifeBuoy } from "lucide-react";

/**
 * The console's footer.
 *
 * Deliberately thinner than the student site's: an operator working a table
 * all day does not need a link farm under it, and the console's navigation
 * lives in the sidebar. What it needs is to say WHICH system and WHICH
 * environment they are looking at, and where to go when something is wrong —
 * in the same register as the rest of the product rather than a grey line that
 * looks like it came with the framework.
 */
export default function Footer() {
  const { t } = useTranslation("common");
  const env = import.meta.env.VITE_ENV_LABEL as string | undefined;

  return (
    <footer
      className="border-t border-[var(--c-hairline)] bg-[var(--c-surface)]"
      data-testid="admin-footer"
    >
      <div className="flex w-full flex-col items-start justify-between gap-[12px] px-[16px] py-[18px] text-[13px] text-[var(--c-muted)] sm:flex-row sm:items-center sm:px-[32px]">
        <p className="m-0 inline-flex items-center gap-[10px]">
          <span
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-[var(--radius-lg)]"
            style={{ background: "var(--grad-brand)" }}
          >
            <GraduationCap className="h-[14px] w-[14px] text-white" aria-hidden="true" />
          </span>
          <span>
            <span className="font-semibold text-[var(--c-ink)]" style={{ fontFamily: "var(--font-display)" }}>
              {t("brand.name")}
            </span>{" "}
            {t("footer.console", "admin console")} · © {new Date().getFullYear()}
          </span>
          {env ? (
            <span className="rounded-[var(--radius-pill)] bg-[var(--c-primary-soft)] px-[10px] py-[2px] text-[11px] font-bold uppercase tracking-[0.6px] text-[var(--c-primary-text)]">
              {env}
            </span>
          ) : null}
        </p>
        <a
          href="mailto:support@etutor.test"
          className="et-press inline-flex items-center gap-[8px] rounded-[var(--radius-pill)] border border-[var(--c-hairline-strong)] px-[14px] py-[7px] text-[13px] font-medium text-[var(--c-body)] transition-colors hover:border-[var(--c-primary)] hover:text-[var(--c-primary-text)]"
        >
          <LifeBuoy className="h-[14px] w-[14px]" aria-hidden="true" />
          {t("footer.support", "Support")}
        </a>
      </div>
    </footer>
  );
}
