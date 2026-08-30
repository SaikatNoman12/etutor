import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "~/components/shared/LanguageToggle";
import { useAppSelector } from "~/hooks/useAppSelector";

export default function Header() {
  const { t } = useTranslation("common");
  // A "Sign in" link shown to someone already signed in is the kind of small wrongness
  // that makes a demo feel unfinished.
  const user = useAppSelector((s) => s.auth?.user);
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link to="/" className="text-xl font-bold" data-testid="header-logo">
          {t("brand.name")}
        </Link>
        <nav className="flex items-center gap-4">
          <LanguageToggle />
          {!user && (
            <Link to="/signin" className="hover:text-primary">
              {t("auth.signIn", { defaultValue: "Sign in" })}
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
