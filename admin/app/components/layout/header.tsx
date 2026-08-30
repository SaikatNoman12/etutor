import { Link } from "react-router";
import { LanguageToggle } from "~/components/shared/LanguageToggle";

export default function Header() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between mx-auto px-4">
        <Link to="/" className="text-xl font-bold">
          Brand
        </Link>
        <nav className="flex items-center gap-4">
          <LanguageToggle />
          <Link to="/login" className="hover:text-primary">Login</Link>
        </nav>
      </div>
    </header>
  );
}
