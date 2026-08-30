import { useTranslation } from "react-i18next";

/**
 * The console's footer.
 *
 * Deliberately thinner than the student site's: an operator working a table all
 * day does not need a link farm under it, and the console's navigation lives in
 * the sidebar. What it does need is to say WHICH system and WHICH environment
 * they are looking at — this bar sat under the production console reading
 * "© React Starter Kit", which names neither.
 */
export default function Footer() {
  const { t } = useTranslation("common");
  const env = import.meta.env.VITE_ENV_LABEL as string | undefined;

  return (
    <footer
      className="border-t border-[var(--c-hairline)] bg-[var(--c-surface)]"
      data-testid="admin-footer"
    >
      <div className="container mx-auto flex flex-col items-center justify-between gap-[8px] px-4 py-[20px] text-[13px] text-[var(--c-muted)] sm:flex-row">
        <p>
          © {new Date().getFullYear()} {t("brand.name")}{" "}
          {t("footer.console", "admin console")}.{" "}
          {t("footer.rights", "All rights reserved.")}
        </p>
        <p className="flex items-center gap-[12px]">
          {env && (
            <span className="rounded-full bg-[var(--c-primary-soft)] px-[10px] py-[2px] font-medium text-[var(--c-primary-text)]">
              {env}
            </span>
          )}
          <a
            href="mailto:support@etutor.test"
            className="text-[var(--c-link)] hover:underline"
          >
            {t("footer.support", "Support")}
          </a>
        </p>
      </div>
    </footer>
  );
}
