/**
 * How a course names its category — one shape, every endpoint.
 *
 * There were two. The course DETAIL endpoint returned an object,
 * `{ name, slug }`; the three list projections — the catalogue grid, an
 * instructor's courses, and the cart lines — returned the bare name as a
 * string. One field, one name, two types, and nothing in the code said which
 * you would get.
 *
 * Every screen picked the object form (`course.category?.name`), so on the
 * three that send a string that expression is `undefined` and the card's
 * category pill rendered EMPTY — an orange chip with nothing in it on every
 * course in the catalogue. The same mismatch silently broke the course list's
 * category filter: it compares `c.category?.name` against the selected name,
 * which is never equal, so choosing a category emptied the page.
 *
 * A projection is the answer to "what category is this course in". There is
 * one answer, so there is one function, and a fourth caller cannot invent a
 * fifth shape without deleting this.
 */
export interface CategoryRef {
  name: string;
  slug: string;
}

export function categoryRef(
  category?: { name?: string | null; slug?: string | null } | null,
): CategoryRef | null {
  if (!category?.name) return null;
  return { name: category.name, slug: category.slug ?? "" };
}
