// View models — the response shapes the student screens actually render.
//
// Hand-authored (not generated): each of these widens a generated domain type with the
// embedded relations the API returns for a particular screen. They lived inline in the
// pages, which meant s-06-cart and s-07-checkout each declared their own CartLine/CartView
// and s-05 re-declared s-02's CourseRow under a second name — the same shape maintained in
// two places, drifting on the next change. Declared once here, imported by the pages.
//
// Everything is optional on purpose: these describe an envelope the backend MAY embed,
// so a screen reads them defensively rather than asserting a relation was loaded.
import type { Cart } from '~/types/cart';
import type { CartItem } from '~/types/cart-item';
import type { Course } from '~/types/course';
import type { CourseSection } from '~/types/course-section';
import type { Enrollment } from '~/types/enrollment';
import type { Lesson } from '~/types/lesson';
import type { LessonProgress } from '~/types/lesson-progress';
import type { Order } from '~/types/order';
import type { OrderItem } from '~/types/order-item';
import type { User } from '~/types/user';

/** A catalogue card: a course plus the category name the grid labels it with. */
export type CourseRow = Course & { category?: { name?: string } };

/** A course-detail syllabus section with its lessons embedded. */
export type SyllabusSection = CourseSection & { lessons?: Lesson[] };

/** GET /api/courses/:slug — the course plus category, instructor and syllabus. */
export type CourseDetail = Course & {
  category?: { name?: string } | null;
  instructor?: {
    id?: string;
    name?: string;
    headline?: string;
    title?: string;
    courseCount?: number;
    avatarUrl?: string;
  } | null;
  sections?: SyllabusSection[];
  lessons?: Lesson[];
};

/** An instructor as the directory lists them (aggregates, no User record needed). */
export type InstructorRow = {
  id?: string;
  name?: string;
  headline?: string | null;
  courseCount?: number;
  studentCount?: number;
  avatarUrl?: string;
};

/** GET /api/instructors/:id — the User plus aggregates and their course list. */
export type InstructorDetail = User & {
  courses?: CourseRow[];
  courseCount?: number;
  studentCount?: number;
  ratingAvg?: number;
};

/** A cart line with the course fields the cart and checkout rows render. */
export type CartLine = CartItem & {
  course?: {
    title?: string;
    slug?: string;
    thumbnailUrl?: string;
    category?: { name?: string } | null;
  };
  title?: string;
  price?: number;
};

/** GET /api/carts/me — the cart with its lines and any applied coupon. */
export type CartView = Cart & {
  items?: CartLine[];
  coupon?: { code?: string; discountValue?: number } | null;
  total?: number;
};

/** An order row in the history list. */
export type OrderRow = Order & { items?: unknown[]; itemCount?: number };

/** A purchased line on an order. */
export type OrderLine = OrderItem & {
  course?: { title?: string; slug?: string } | null;
  title?: string;
  price?: number;
};

/** GET /api/orders/:id — the order with its lines and any applied coupon. */
export type OrderView = Order & {
  items?: OrderLine[];
  coupon?: { code?: string } | null;
};

/** An enrollment card in My Learning, with the course it grants access to. */
export type EnrollmentRow = Enrollment & {
  course?: { id?: string; slug?: string; title?: string; thumbnailUrl?: string };
};

/** A lesson in the player, carrying this student's completion state. */
export type PlayerLesson = Lesson & { isCompleted?: boolean; progress?: LessonProgress };

/** GET /api/enrollments/:slug — the enrollment plus the course's lesson list. */
export type PlayerDetail = Enrollment & {
  course?: (Partial<Course> & { lessons?: PlayerLesson[] }) | null;
  lessons?: PlayerLesson[];
};
