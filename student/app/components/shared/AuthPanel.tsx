import { Link } from 'react-router';
import { GraduationCap, Check } from 'lucide-react';

/**
 * The brand half of a sign-in / sign-up screen.
 *
 * A form floating alone in the middle of a light page reads as a dialog
 * someone forgot to close. Give it a partner: an ink panel with the aurora
 * behind it, the mark, and three lines that say what the account is for.
 * The form stays exactly the form it was; this only gives it somewhere to be.
 *
 * Below `lg` the panel collapses to a compact band above the form — the
 * message survives, the height does not.
 */
export function AuthPanel({
  brand,
  title,
  points,
  homeHref = '/',
}: {
  brand: string;
  title: string;
  points: string[];
  homeHref?: string;
}) {
  return (
    <aside
      className="et-aurora relative flex flex-col justify-between overflow-hidden rounded-[var(--radius-xl)] bg-[var(--c-ink)] p-[24px] text-white shadow-[var(--shadow-3)] lg:min-h-[560px] lg:p-[40px]"
      aria-hidden="false"
    >
      <Link
        to={homeHref}
        className="inline-flex w-fit items-center gap-[10px] text-[20px] font-extrabold tracking-[-0.03em] text-white"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        <span className="inline-flex h-[36px] w-[36px] items-center justify-center rounded-[10px]" style={{ background: 'var(--grad-brand)' }}>
          <GraduationCap className="h-[20px] w-[20px] text-white" aria-hidden="true" />
        </span>
        {brand}
      </Link>

      <div className="mt-[28px] lg:mt-0">
        <p
          className="m-0 max-w-[16ch] text-[26px] font-extrabold leading-[1.1] tracking-[-0.025em] text-white sm:text-[32px] lg:text-[38px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </p>
        <ul className="m-0 mt-[20px] hidden list-none flex-col gap-[12px] p-0 sm:flex">
          {points.map((pt) => (
            <li key={pt} className="flex items-start gap-[10px] text-[15px] leading-[1.5] text-[rgb(255_255_255/0.78)]">
              <span className="mt-[2px] inline-flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[rgb(255_255_255/0.12)]">
                <Check className="h-[12px] w-[12px] text-[#ffb08a]" aria-hidden="true" />
              </span>
              {pt}
            </li>
          ))}
        </ul>
      </div>

    </aside>
  );
}

export default AuthPanel;
