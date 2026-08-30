import { useTranslation } from 'react-i18next';
import { Button } from '~/components/ui/button';

/**
 * LanguageToggle — cycles the active i18n locale (EN ⇄ KO).
 *
 * A single button rather than a dropdown: with two locales a cycle button is
 * the smallest thing that works and adds no new UI dependency. The label shows
 * the CURRENT language; clicking switches to the next one. i18next's
 * LanguageDetector persists the choice to localStorage (i18nextLng), so the
 * selection survives reloads and is picked up by root's i18n init.
 */
const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'ko', label: '한국어' },
] as const;

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const activeIndex = Math.max(
    0,
    LOCALES.findIndex((l) => l.code === i18n.language),
  );
  const current = LOCALES[activeIndex] ?? LOCALES[0];
  const next = LOCALES[(activeIndex + 1) % LOCALES.length];

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      data-testid="language-toggle"
      aria-label={`Switch language to ${next.label}`}
      onClick={() => {
        void i18n.changeLanguage(next.code);
      }}
    >
      {current.label}
    </Button>
  );
}
