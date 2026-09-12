import { Link } from 'react-router';
import { Star, Users } from 'lucide-react';
import type { CourseRow } from '~/types/view-models';

/**
 * A course, as a card — ONE definition, used by the home page, the catalogue
 * and an instructor's profile.
 *
 * It was written three times, each drifting: the catalogue showed a level the
 * home page did not, the home page's rating row had a border the others lacked,
 * and a change to the composition meant finding all three. A card is a design
 * decision, and a design decision that exists three times is three decisions.
 *
 * The composition is deliberate:
 *  - Category and level sit ON the image, over a scrim, so the body below is
 *    free for the two things that actually sell a course — its title and its
 *    price. Stacked above the title they pushed it to third place in the
 *    reading order.
 *  - The title gets the display face and two lines. It is the only element
 *    allowed to be loud.
 *  - Price is the anchor, bottom right, where the eye lands last and decides.
 *  - Rating and enrolment are meta: small, muted, never competing.
 */
export function CourseCard({
  course,
  testId,
  levelLabel,
  studentsLabel = 'students',
}: {
  course: CourseRow;
  testId: string;
  levelLabel?: string;
  studentsLabel?: string;
}) {
  const price = course.price ?? 0;
  const was = course.compareAtPrice ?? null;
  const off = was && was > price ? Math.round(((was - price) / was) * 100) : null;

  return (
    <Link
      to={`/courses/${course.slug ?? ''}`}
      data-testid={testId}
      className="et-lift group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--c-hairline)] bg-[var(--c-surface)] shadow-[var(--shadow-1)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden [background:var(--media-fallback)]">
        {course.thumbnailUrl ? (
          <img
            src={course.thumbnailUrl}
            alt={course.title ?? ''}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : null}
        {/* The scrim is what lets white type sit on an arbitrary photograph. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'var(--overlay-scrim)' }}
        />
        <div className="absolute inset-x-[12px] top-[12px] flex items-start justify-between gap-[8px]">
          {course.category?.name ? (
            <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[rgb(255_255_255/0.92)] px-[10px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--c-primary-text)] shadow-[var(--shadow-0)]">
              {course.category.name}
            </span>
          ) : <span />}
          {levelLabel ? (
            <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[rgb(22_22_29/0.55)] px-[10px] py-[3px] text-[11px] font-semibold uppercase tracking-[0.5px] text-white backdrop-blur-sm">
              {levelLabel}
            </span>
          ) : null}
        </div>
        {off ? (
          <span className="absolute bottom-[12px] left-[12px] inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--c-primary)] px-[10px] py-[3px] text-[11px] font-bold uppercase tracking-[0.5px] text-[var(--c-on-primary)]">
            {off}% off
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-[10px] p-[16px]">
        <p
          className="line-clamp-2 text-[17px] font-bold leading-[1.3] tracking-[-0.01em] text-[var(--c-ink)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {course.title ?? ''}
        </p>

        <div className="mt-auto flex items-end justify-between gap-[8px] pt-[6px]">
          <span className="flex flex-col gap-[3px] text-[12px] text-[var(--c-muted)]">
            <span className="inline-flex items-center gap-[4px] font-semibold text-[var(--c-ink)]">
              <Star className="h-[13px] w-[13px] fill-[var(--c-primary)] text-[var(--c-primary)]" aria-hidden="true" />
              {(course.ratingAvg ?? 0).toFixed(1)}
            </span>
            <span className="inline-flex items-center gap-[4px]">
              <Users className="h-[12px] w-[12px]" aria-hidden="true" />
              {(course.studentCount ?? 0).toLocaleString()} {studentsLabel}
            </span>
          </span>
          <span className="text-right leading-none">
            {was && was > price ? (
              <span className="mb-[2px] block text-[12px] text-[var(--c-muted)] line-through">${was}</span>
            ) : null}
            <span className="text-[20px] font-extrabold tracking-[-0.02em] text-[var(--c-primary-text)]">
              ${price}
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default CourseCard;
