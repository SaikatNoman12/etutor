import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "~/components/shared/LanguageToggle";
import { useAppSelector } from "~/hooks/useAppSelector";

/**
 * The outer chrome bar. It shipped from the template with the literal word "Brand" and a
 * "Login" link that showed even to someone already signed in — two placeholders that
 * reached the running console and read there exactly as they read here.
 */
export default function Header() {
  const { t } = useTranslation("common");
  const user = useAppSelector((s) => s.auth?.user);
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link to="/admin" className="text-xl font-bold" data-testid="header-logo">
          {t("brand.name", { defaultValue: "E-Tutor" })}
        </Link>
        <nav className="flex items-center gap-4">
          <LanguageToggle />
          {!user && (
            <Link to="/admin/login" className="hover:text-primary">
              {t("auth.signIn", { defaultValue: "Sign in" })}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
