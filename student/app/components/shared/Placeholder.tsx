import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';

/**
 * What a page shows when it has nothing to show, and when it could not find
 * out.
 *
 * These were one grey sentence in a bordered box, repeated in a dozen files —
 * so "no courses match your filters" and "we could not reach the server" looked
 * identical, and neither offered a way forward. An empty state is a screen the
 * visitor is actually looking at; it gets a mark, a line that says what
 * happened, and, where there is one, the thing to do next.
 */
export function Placeholder({
  tone = 'empty',
  title,
  hint,
  action,
  testId,
}: {
  tone?: 'empty' | 'error';
  title: string;
  hint?: string;
  action?: ReactNode;
  testId?: string;
}) {
  const isError = tone === 'error';
  const Icon = isError ? AlertTriangle : Inbox;
  return (
    <div
      data-testid={testId}
      className="flex flex-col items-center justify-center gap-[12px] rounded-[var(--radius-xl)] border border-dashed border-[var(--c-hairline-strong)] bg-[var(--c-surface)] px-[24px] py-[48px] text-center"
    >
      <span
        className={`inline-flex h-[52px] w-[52px] items-center justify-center rounded-[var(--radius-pill)] ${
          isError ? 'bg-[color-mix(in_srgb,var(--c-error)_10%,transparent)]' : 'bg-[var(--c-surface-soft)]'
        }`}
      >
        <Icon
          className={`h-[24px] w-[24px] ${isError ? 'text-[var(--c-error)]' : 'text-[var(--c-muted)]'}`}
          aria-hidden="true"
        />
      </span>
      <p
        className="m-0 text-[18px] font-bold tracking-[-0.01em] text-[var(--c-ink)]"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </p>
      {hint ? <p className="m-0 max-w-[46ch] text-[14px] leading-[1.6] text-[var(--c-muted)]">{hint}</p> : null}
      {action ? <div className="mt-[6px]">{action}</div> : null}
    </div>
  );
}

/**
 * A page's title block: an eyebrow, the title, a rule in the brand colour.
 *
 * Every screen had invented its own — some with a rule, some without, three
 * different sizes of the same heading — which is how a product ends up looking
 * assembled rather than designed.
 */
export function PageHeading({
  eyebrow,
  title,
  hint,
  right,
  testId,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  right?: ReactNode;
  testId?: string;
}) {
  return (
    <div className="mb-[24px] flex flex-wrap items-end justify-between gap-[16px]">
      <div>
        {eyebrow ? (
          <p className="m-0 mb-[6px] text-[12px] font-bold uppercase tracking-[1.2px] text-[var(--c-primary-text)]">
            {eyebrow}
          </p>
        ) : null}
        <h1
          data-testid={testId}
          className="m-0 text-[30px] font-extrabold leading-[1.15] tracking-[-0.025em] text-[var(--c-ink)] sm:text-[36px]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {title}
        </h1>
        {hint ? <p className="m-0 mt-[6px] text-[14px] text-[var(--c-muted)]">{hint}</p> : null}
        <div className="mt-[12px] h-[3px] w-[52px] rounded-[var(--radius-pill)] bg-[var(--grad-brand)]" />
      </div>
      {right ? <div className="flex items-center gap-[8px]">{right}</div> : null}
    </div>
  );
}

export default Placeholder;
