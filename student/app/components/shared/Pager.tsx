/**
 * One pager, for every paginated list.
 *
 * The catalogue drew its own; the order history drew none at all, which is why
 * anything past the server's first page of orders was unreachable — the page
 * asked for page 1 and offered no way to ask for page 2. Two lists with the same
 * problem and one of them solved is how the second one stays broken.
 *
 * Renders nothing at a single page, so a short list carries no chrome.
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BASE =
  'inline-flex min-h-[40px] min-w-[40px] cursor-pointer items-center justify-center rounded-[var(--radius-md)] border px-[12px] text-[14px] font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const QUIET = `${BASE} border-[var(--c-hairline-strong)] bg-[var(--c-surface)] text-[var(--c-body)] hover:bg-[var(--c-surface-soft)]`;
const ACTIVE = `${BASE} border-[var(--c-primary)] bg-[var(--c-primary-soft)] text-[var(--c-primary)]`;

export interface PagerProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  label: string;
  prevLabel: string;
  nextLabel: string;
  testId: string;
}

export function Pager({ page, totalPages, onChange, label, prevLabel, nextLabel, testId }: PagerProps) {
  if (totalPages <= 1) return null;
  const current = Math.min(Math.max(1, page), totalPages);

  return (
    <nav className="mt-[24px] flex flex-wrap items-center gap-[8px]" aria-label={label} data-testid={`${testId}-pagination`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(1, current - 1))}
        disabled={current <= 1}
        aria-label={prevLabel}
        className={QUIET}
        data-testid={`${testId}-page-prev`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      {Array.from({ length: totalPages }).map((_, i) => {
        const n = i + 1;
        const active = n === current;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-current={active ? 'page' : undefined}
            className={active ? ACTIVE : QUIET}
            data-testid={`${testId}-page-${n}`}
          >
            {n}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(Math.min(totalPages, current + 1))}
        disabled={current >= totalPages}
        aria-label={nextLabel}
        className={QUIET}
        data-testid={`${testId}-page-next`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export default Pager;
