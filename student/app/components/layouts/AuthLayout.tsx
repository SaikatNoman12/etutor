/**
 * AuthLayout — the shell for the design's AuthLayout screens (sign in, sign up).
 *
 * A minimal brand bar over a centred form area, matching the auth prototypes.
 * It renders <GuestGuard/> (which owns the <Outlet/>): a signed-in visitor is
 * redirected home instead of seeing the auth form again. Distinct from the
 * StudentLayout shell — RULE-F3.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import { GuestGuard } from '~/components/guards/GuestGuard';
import { LanguageToggle } from '~/components/shared/LanguageToggle';

export default function AuthLayout() {
  const { t } = useTranslation('common');

  return (
    <div className="flex min-h-screen flex-col" data-testid="auth-layout">
      <header className="border-b bg-card" data-shell="topbar">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold" data-testid="auth-logo">
            <GraduationCap className="size-6 text-primary" aria-hidden="true" />
            <span className="brand-name">{t('brand.name')}</span>
          </Link>
          <span className="flex-1" />
          <LanguageToggle />
          <Link
            to="/courses"
            data-testid="auth-browse"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            {t('auth.browseCourses')}
          </Link>
        </div>
      </header>

      <main className="container mx-auto flex flex-1 items-center justify-center px-4 py-12" data-shell="content" data-testid="auth-main">
        <GuestGuard />
      </main>
    </div>
  );
}
