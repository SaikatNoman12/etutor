/**
 * The placeholder a page shows while it is still deciding what to show.
 *
 * It exists because the guards rendered `null` while the session check was in
 * flight, which is correct about not flashing a redirect and wrong about what
 * the visitor sees: a completely white page, for as long as GET /auth/me takes.
 * On a free-tier API that has gone to sleep that is the better part of a minute
 * of blank screen, and "the page didn't load" is exactly how it reads.
 *
 * Laid out at the same container width and the same 24px gutter as the real
 * pages, so the skeleton occupies the band the content will land in rather than
 * jumping when it arrives.
 */
export function PageSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-[1240px] px-[24px] py-[32px]"
      data-testid="page-skeleton"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="h-[36px] w-[280px] animate-pulse rounded-[6px] bg-[var(--c-surface-soft)]" />
      <div className="mt-[12px] h-[16px] w-[180px] animate-pulse rounded-[4px] bg-[var(--c-surface-soft)]" />
      <div className="mt-[32px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[240px] animate-pulse rounded-[8px] border border-[var(--c-hairline)] bg-[var(--c-surface-soft)]"
          />
        ))}
      </div>
    </div>
  );
}

export default PageSkeleton;
