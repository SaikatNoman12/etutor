import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "~/components/shared/LanguageToggle";

export default function Header() {
  const { t } = useTranslation("common");
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link to="/" className="text-xl font-bold" data-testid="header-logo">
          {t("brand.name")}
        </Link>
        <nav className="flex items-center gap-4">
          <LanguageToggle />
          <Link to="/login" className="hover:text-primary">
            {t("auth.signIn")}
          </Link>
        </nav>
      </div>
    </header>
  );
}
