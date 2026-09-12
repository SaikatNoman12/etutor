// View models — the response shapes the admin console screens actually render.
//
// Hand-authored (not generated): each widens a generated domain type, or names the
// row shape a console table renders, with the embedded relations and aggregates the
// admin endpoints return. They lived inline in the pages, one copy per screen, which
// is the duplication ~/types/ exists to prevent — adm-06 and adm-01 each described an
// order row, and neither knew about the other.
//
// The `[key: string]: unknown` index signatures are deliberate: these rows feed a
// generic table that addresses cells by string key.
import type { enrollment_status } from '~/enums/enrollment-status.enum';
import type { order_status } from '~/enums/order-status.enum';
import type { OrderResponse } from '~/types/order';
import type { OrderItemResponse } from '~/types/order-item';

/** A recent-orders row on the dashboard. */
export interface DashboardOrderRow {
  id: string;
  orderNumber: string;
  student?: string | null;
  total?: number | null;
  status?: order_status;
}

/** A best-selling course on the dashboard. */
export interface DashboardTopCourse {
  id: string;
  title: string;
  studentCount?: number | null;
}

/** GET /api/admin/dashboard — the console's headline figures. */
export interface DashboardStats {
  publishedCourses?: number;
  students?: number;
  paidOrders30d?: number;
  revenue30d?: number;
  topCourses?: DashboardTopCourse[];
}

/** A paginated list envelope carrying order rows. */
export interface OrdersListResponse {
  items?: DashboardOrderRow[];
}

/** A row in the admin course table. */
export type AdminCourseRow = {
  id: string;
  title?: string;
  slug?: string;
  price?: number | string;
  status?: string | number;
  studentCount?: number | string;
  categoryId?: string;
  instructorId?: string;
  level?: string | number;
  summary?: string | null;
  thumbnailUrl?: string | null;
  category?: { name?: string } | null;
  instructor?: { name?: string; firstName?: string; lastName?: string } | null;
  categoryName?: string;
  instructorName?: string;
  [key: string]: unknown;
};

/** A lesson row inside the admin course-detail syllabus. */
export interface LessonRow {
  id: string;
  order?: number;
  section?: string;
  title?: string;
  type?: string;
  duration?: string | number;
  [key: string]: unknown;
}

/** GET /api/admin/courses/:id as the detail screen reads it. */
export interface CourseDetail {
  id?: string;
  title?: string;
  slug?: string;
  category?: string;
  categoryId?: string;
  instructor?: string;
  instructorId?: string;
  price?: number;
  status?: string | number;
  summary?: string;
  lessons?: LessonRow[];
  studentsCount?: number;
  studentCount?: number;
  enrollmentCount?: number;
  rating?: number;
  averageRating?: number;
  [key: string]: unknown;
}

/** A row in the admin category table. */
export type AdminCategoryRow = {
  id: string;
  name?: string;
  slug?: string;
  courseCount?: number | string;
  displayOrder?: number | string;
  isActive?: boolean;
  iconUrl?: string | null;
  [key: string]: unknown;
};

/** A row in the admin user table. */
export type AdminUserRow = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string | number;
  status?: string | number;
  courses?: number | string;
  courseCount?: number | string;
  avatarUrl?: string | null;
  [key: string]: unknown;
};

/** A row in the admin order table. */
export interface OrderRow {
  id: string;
  orderNumber: string;
  student: string;
  items: number;
  total: number;
  status: string;
  placedAt: string;
  [key: string]: unknown;
}

/** GET /api/admin/orders/:id — the order with its purchased lines. */
export interface OrderDetailData extends OrderResponse {
  items?: OrderItemResponse[];
  /** The console's projection names the coupon by its code, not its id. */
  coupon?: { code?: string } | null;
  paymentMethod?: string | null;
}

/** A row in the admin enrollment table. */
export interface EnrollmentRow {
  id: string;
  student: string | null;
  course: string | null;
  progressPercent: number | null;
  status: enrollment_status | null;
  enrolledAt: string | null;
}

/** The paginated envelope the enrollment list returns. */
export interface EnrollmentListResponse {
  items: EnrollmentRow[];
  meta: { page: number; page_size: number; total: number };
}

/** A row in the admin coupon table. */
export type AdminCouponRow = {
  id: string;
  code?: string;
  discountType?: number | string;
  discountValue?: number | string;
  maxUses?: number | string;
  usedCount?: number | string;
  validFrom?: string;
  validUntil?: string;
  isActive?: boolean;
  [key: string]: unknown;
};
