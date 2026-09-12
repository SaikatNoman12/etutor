/**
 * A slug that types itself from whatever names the record.
 *
 * An operator should not have to know what a slug is. While they type a name,
 * the slug follows it; the moment they edit the slug themselves it stops
 * following, because at that point they mean the thing they typed. Editing an
 * existing record starts detached — renaming a category must not silently change
 * a URL that is already published.
 *
 * The rule it produces is the same one `validation.slug` enforces, so the field
 * never auto-fills a value the form would then reject.
 */
import { useRef, useState } from 'react';

/** "Data & Analytics!" → "data-analytics" — lowercase, digits, single hyphens. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface SlugField {
  /** Bind to the slug input's `value`. */
  value: string;
  /** Bind to the slug input's `onChange` — marks it hand-edited. */
  onChange: (e: { target: { value: string } }) => void;
  /** Call from the source field's `onChange` with its new value. */
  follow: (source: string) => void;
  /** Reset for a different record (or a fresh create). */
  reset: (initial?: string) => void;
}

export function useSlugField(initial = ''): SlugField {
  const [value, setValue] = useState(initial);
  // An existing slug is already someone's decision; only a blank one follows.
  const dirty = useRef(initial.length > 0);

  return {
    value,
    onChange: (e) => {
      dirty.current = true;
      setValue(e.target.value);
    },
    follow: (source) => {
      if (!dirty.current) setValue(slugify(source));
    },
    reset: (next = '') => {
      dirty.current = next.length > 0;
      setValue(next);
    },
  };
}
