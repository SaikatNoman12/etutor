import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Category } from '../category/category.entity';
import { Course } from '../course/course.entity';
import { CourseSection } from '../course-section/course-section.entity';
import { Coupon } from '../coupon/coupon.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { Lesson } from '../lesson/lesson.entity';
import { LessonProgress } from '../lesson-progress/lesson-progress.entity';
import { Order } from '../order/order.entity';
import { OrderItem } from '../order-item/order-item.entity';
import { User } from '../user/user.entity';

import { course_status } from '../../common/enums/course-status.enum';
import { enrollment_status } from '../../common/enums/enrollment-status.enum';
import { order_status } from '../../common/enums/order-status.enum';
import { user_role } from '../../common/enums/user-role.enum';
import { categoryRef } from '../../core/utils/category-ref';

import {
  AdminCategoryQueryDto,
  AdminCouponQueryDto,
  AdminCourseQueryDto,
  AdminEnrollmentQueryDto,
  AdminOrderQueryDto,
  AdminUserQueryDto,
  CreateAdminCategoryDto,
  CreateAdminCouponDto,
  CreateAdminCourseDto,
  CreateAdminLessonDto,
  CreateAdminUserDto,
  UpdateAdminCategoryDto,
  UpdateAdminCouponDto,
  UpdateAdminCourseDto,
  UpdateAdminUserDto,
  UpdateOrderStatusDto,
} from './dtos';

const PAGE_SIZE = 10;
const BCRYPT_ROUNDS = 10;

/**
 * AdminConsoleService — the /api/admin/* management surface. It spans many
 * entities (course, lesson, category, user, order, enrollment, coupon), so —
 * like the canonical DashboardService — it injects the DataSource and reaches
 * each entity's Repository directly rather than extending single-entity
 * BaseService. Every list returns a { items, meta } page; every response is a
 * mapped camelCase projection, never a raw entity.
 */
@Injectable()
export class AdminConsoleService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── dashboard ────────────────────────────────────────────────────────
  async getStats() {
    const courseRepo = this.dataSource.getRepository(Course);
    const userRepo = this.dataSource.getRepository(User);
    const orderRepo = this.dataSource.getRepository(Order);

    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const publishedCourses = await courseRepo.count({
      where: { status: course_status.PUBLISHED },
    });
    const students = await userRepo.count({
      where: { role: user_role.STUDENT },
    });
    const paidOrders30d = await orderRepo.count({
      where: { status: order_status.PAID, paidAt: MoreThanOrEqual(since) },
    });

    const revenueRow = await orderRepo
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total), 0)', 'sum')
      .where('o.status = :status', { status: order_status.PAID })
      .andWhere('o.paidAt >= :since', { since })
      .getRawOne<{ sum: string }>();
    const revenue30d = Number(revenueRow?.sum ?? 0);

    const recent = await orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'u')
      .orderBy('o.placedAt', 'DESC')
      .take(5)
      .getMany();
    const recentOrders = recent.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      student: o.user?.fullName ?? o.billingName,
      total: o.total,
      status: o.status,
      placedAt: o.placedAt,
    }));

    const top = await courseRepo
      .createQueryBuilder('c')
      .orderBy('c.studentCount', 'DESC')
      .take(4)
      .getMany();
    const topCourses = top.map((c) => ({
      id: c.id,
      title: c.title,
      studentCount: c.studentCount,
    }));

    return {
      publishedCourses,
      students,
      paidOrders30d,
      revenue30d,
      recentOrders,
      topCourses,
    };
  }

  // ── courses & lessons ────────────────────────────────────────────────
  async listCourses(query: AdminCourseQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource
      .getRepository(Course)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.category', 'cat')
      .leftJoinAndSelect('c.instructor', 'ins');

    if (query.search) {
      qb.andWhere(
        '(c.title ILIKE :s OR c.slug ILIKE :s OR ins.fullName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.category) {
      qb.andWhere('cat.slug = :cat', { cat: query.category });
    }
    if (query.status !== undefined) {
      qb.andWhere('c.status = :st', { st: query.status });
    }

    switch (query.sort) {
      case 'popular':
        qb.orderBy('c.studentCount', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('c.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('c.price', 'DESC');
        break;
      default:
        qb.orderBy('c.createdAt', 'DESC');
    }

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const items = rows.map((c) => ({
      id: c.id,
      title: c.title,
      category: categoryRef(c.category),
      instructor: c.instructor
        ? { id: c.instructor.id, name: c.instructor.fullName }
        : null,
      // The edit form opens from a LIST row and binds its two <select>s to these
      // foreign keys. The row carried only the display shapes above, so opening
      // a course to edit it showed no category and no instructor — and saving
      // was then refused for two fields the operator could see were filled in
      // on the page behind the dialog.
      categoryId: c.categoryId,
      instructorId: c.instructorId,
      price: c.price,
      studentCount: c.studentCount,
      status: c.status,
    }));
    return { items, meta: this.meta(page, total) };
  }

  async getCourse(id: string) {
    const course = await this.dataSource.getRepository(Course).findOne({
      where: { id },
      relations: { category: true, instructor: true },
    });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const sections = await this.dataSource.getRepository(CourseSection).find({
      where: { courseId: id },
      order: { displayOrder: 'ASC' },
    });
    const sectionIds = sections.map((s) => s.id);
    const lessons = sectionIds.length
      ? await this.dataSource.getRepository(Lesson).find({
          where: { sectionId: In(sectionIds) },
          order: { displayOrder: 'ASC' },
        })
      : [];

    return {
      id: course.id,
      title: course.title,
      slug: course.slug,
      summary: course.summary ?? null,
      description: course.description ?? null,
      thumbnailUrl: course.thumbnailUrl ?? null,
      price: course.price,
      compareAtPrice: course.compareAtPrice ?? null,
      level: course.level,
      language: course.language,
      durationMinutes: course.durationMinutes,
      status: course.status,
      publishedAt: course.publishedAt ?? null,
      categoryId: course.categoryId,
      instructorId: course.instructorId,
      category: categoryRef(course.category),
      instructor: course.instructor
        ? { id: course.instructor.id, name: course.instructor.fullName }
        : null,
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary ?? null,
        displayOrder: s.displayOrder,
        lessons: lessons
          .filter((l) => l.sectionId === s.id)
          .map((l) => this.mapLesson(l)),
      })),
    };
  }

  async createCourse(dto: CreateAdminCourseDto) {
    const repo = this.dataSource.getRepository(Course);
    const slug = dto.slug?.trim() || this.slugify(dto.title);

    const clash = await repo.findOne({ where: { slug } });
    if (clash) {
      throw new ConflictException(`A course with slug "${slug}" already exists!`);
    }

    const course = repo.create({
      title: dto.title,
      slug,
      summary: dto.summary,
      description: dto.description,
      thumbnailUrl: dto.thumbnailUrl,
      price: dto.price ?? 0,
      compareAtPrice: dto.compareAtPrice,
      level: dto.level,
      language: dto.language ?? 'en',
      durationMinutes: dto.durationMinutes ?? 0,
      status: dto.status,
      categoryId: dto.categoryId,
      instructorId: dto.instructorId,
      publishedAt:
        dto.status === course_status.PUBLISHED ? new Date() : undefined,
    });
    const saved = await repo.save(course);
    return this.getCourse(saved.id);
  }

  async updateCourse(id: string, dto: UpdateAdminCourseDto) {
    const repo = this.dataSource.getRepository(Course);
    const course = await repo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (dto.title !== undefined) course.title = dto.title;
    if (dto.slug !== undefined) course.slug = dto.slug;
    if (dto.summary !== undefined) course.summary = dto.summary;
    if (dto.description !== undefined) course.description = dto.description;
    if (dto.thumbnailUrl !== undefined) course.thumbnailUrl = dto.thumbnailUrl;
    if (dto.price !== undefined) course.price = dto.price;
    if (dto.compareAtPrice !== undefined)
      course.compareAtPrice = dto.compareAtPrice;
    if (dto.level !== undefined) course.level = dto.level;
    if (dto.language !== undefined) course.language = dto.language;
    if (dto.durationMinutes !== undefined)
      course.durationMinutes = dto.durationMinutes;
    if (dto.categoryId !== undefined) course.categoryId = dto.categoryId;
    if (dto.instructorId !== undefined) course.instructorId = dto.instructorId;
    if (dto.status !== undefined) {
      course.status = dto.status;
      if (dto.status === course_status.PUBLISHED && !course.publishedAt) {
        course.publishedAt = new Date();
      }
    }

    await repo.save(course);
    return this.getCourse(id);
  }

  async deleteCourse(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(Course);
    const course = await repo.findOne({ where: { id } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const enrolled = await this.dataSource.getRepository(Enrollment).count({
      where: { courseId: id, status: In([enrollment_status.ACTIVE, enrollment_status.COMPLETED]) },
    });

    if (enrolled > 0) {
      // Never hard-delete a course with paid enrollments — archive it instead.
      course.status = course_status.ARCHIVED;
      await repo.save(course);
      return;
    }

    await repo.delete(id);
  }

  async addLesson(courseId: string, dto: CreateAdminLessonDto) {
    const course = await this.dataSource
      .getRepository(Course)
      .findOne({ where: { id: courseId } });
    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const section = await this.dataSource
      .getRepository(CourseSection)
      .findOne({ where: { id: dto.sectionId } });
    if (!section || section.courseId !== courseId) {
      throw new NotFoundException(
        `Section with ID ${dto.sectionId} not found for this course!`,
      );
    }

    const repo = this.dataSource.getRepository(Lesson);
    const lesson = repo.create({
      sectionId: dto.sectionId,
      title: dto.title,
      contentType: dto.contentType,
      videoUrl: dto.videoUrl,
      content: dto.content,
      durationMinutes: dto.durationMinutes ?? 0,
      displayOrder: dto.displayOrder ?? 0,
      isPreview: dto.isPreview ?? false,
      isPublished: dto.isPublished ?? true,
    });
    const saved = await repo.save(lesson);
    return this.mapLesson(saved);
  }

  async deleteLesson(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(Lesson);
    const lesson = await repo.findOne({ where: { id } });
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const section = await this.dataSource
      .getRepository(CourseSection)
      .findOne({ where: { id: lesson.sectionId } });

    await repo.delete(id);

    if (section) {
      await this.recomputeCourseProgress(section.courseId);
    }
  }

  // ── categories ───────────────────────────────────────────────────────
  async listCategories(query: AdminCategoryQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource
      .getRepository(Category)
      .createQueryBuilder('cat');

    if (query.search) {
      qb.andWhere('(cat.name ILIKE :s OR cat.slug ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    qb.orderBy('cat.displayOrder', 'ASC').addOrderBy('cat.name', 'ASC');

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const courseRepo = this.dataSource.getRepository(Course);
    const items = await Promise.all(
      rows.map(async (cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        courseCount: await courseRepo.count({ where: { categoryId: cat.id } }),
        displayOrder: cat.displayOrder,
        isActive: cat.isActive,
      })),
    );
    return { items, meta: this.meta(page, total) };
  }

  async createCategory(dto: CreateAdminCategoryDto) {
    const repo = this.dataSource.getRepository(Category);
    const clash = await repo
      .createQueryBuilder('cat')
      .where('cat.name = :name OR cat.slug = :slug', {
        name: dto.name,
        slug: dto.slug,
      })
      .getOne();
    if (clash) {
      throw new ConflictException(
        'A category with this name or slug already exists!',
      );
    }

    const category = repo.create({
      name: dto.name,
      slug: dto.slug,
      iconUrl: dto.iconUrl,
      description: dto.description,
      displayOrder: dto.displayOrder ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await repo.save(category);
    return this.mapCategory(saved);
  }

  async updateCategory(id: string, dto: UpdateAdminCategoryDto) {
    const repo = this.dataSource.getRepository(Category);
    const category = await repo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined) category.name = dto.name;
    if (dto.slug !== undefined) category.slug = dto.slug;
    if (dto.iconUrl !== undefined) category.iconUrl = dto.iconUrl;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.displayOrder !== undefined)
      category.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    const saved = await repo.save(category);
    return this.mapCategory(saved);
  }

  async deleteCategory(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(Category);
    const category = await repo.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const courseCount = await this.dataSource
      .getRepository(Course)
      .count({ where: { categoryId: id } });
    if (courseCount > 0) {
      throw new ConflictException(
        'A category that still holds courses cannot be deleted!',
      );
    }

    await repo.delete(id);
  }

  // ── users ────────────────────────────────────────────────────────────
  async listUsers(query: AdminUserQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource.getRepository(User).createQueryBuilder('u');

    if (query.search) {
      qb.andWhere('(u.fullName ILIKE :s OR u.email ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.role !== undefined) {
      qb.andWhere('u.role = :role', { role: query.role });
    }
    if (query.status !== undefined) {
      qb.andWhere('u.status = :status', { status: query.status });
    }
    qb.orderBy('u.createdAt', 'DESC');

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const courseRepo = this.dataSource.getRepository(Course);
    const items = await Promise.all(
      rows.map(async (u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        courseCount:
          u.role === user_role.INSTRUCTOR
            ? await courseRepo.count({ where: { instructorId: u.id } })
            : 0,
        status: u.status,
      })),
    );
    return { items, meta: this.meta(page, total) };
  }

  async createUser(dto: CreateAdminUserDto) {
    const repo = this.dataSource.getRepository(User);
    const existing = await repo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`Email ${dto.email} is already taken!`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = repo.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
      role: dto.role,
      status: dto.status,
    });
    const saved = await repo.save(user);
    return this.mapUser(saved);
  }

  async updateUser(id: string, dto: UpdateAdminUserDto) {
    const repo = this.dataSource.getRepository(User);
    const user = await repo.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined && dto.email !== user.email) {
      const taken = await repo.findOne({ where: { email: dto.email } });
      if (taken) {
        throw new ConflictException(`Email ${dto.email} is already taken!`);
      }
      user.email = dto.email;
    }
    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.role !== undefined) user.role = dto.role;
    if (dto.status !== undefined) user.status = dto.status;

    const saved = await repo.save(user);
    return this.mapUser(saved);
  }

  // ── orders ───────────────────────────────────────────────────────────
  async listOrders(query: AdminOrderQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource
      .getRepository(Order)
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.user', 'u');

    if (query.search) {
      qb.andWhere(
        '(o.orderNumber ILIKE :s OR u.fullName ILIKE :s OR u.email ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.status !== undefined) {
      qb.andWhere('o.status = :status', { status: query.status });
    }
    if (query.dateFrom) {
      qb.andWhere('o.placedAt >= :from', { from: new Date(query.dateFrom) });
    }
    if (query.dateTo) {
      qb.andWhere('o.placedAt <= :to', { to: new Date(query.dateTo) });
    }
    qb.orderBy('o.placedAt', 'DESC');

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const itemRepo = this.dataSource.getRepository(OrderItem);
    const items = await Promise.all(
      rows.map(async (o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        student: o.user?.fullName ?? o.billingName,
        itemCount: await itemRepo.count({ where: { orderId: o.id } }),
        total: o.total,
        status: o.status,
        placedAt: o.placedAt,
      })),
    );
    return { items, meta: this.meta(page, total) };
  }

  async getOrder(id: string) {
    const order = await this.dataSource.getRepository(Order).findOne({
      where: { id },
      relations: { user: true, coupon: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const items = await this.dataSource.getRepository(OrderItem).find({
      where: { orderId: id },
      relations: { course: true },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      total: order.total,
      placedAt: order.placedAt,
      paidAt: order.paidAt ?? null,
      buyer: order.user
        ? {
            id: order.user.id,
            fullName: order.user.fullName,
            email: order.user.email,
          }
        : { fullName: order.billingName, email: order.billingEmail },
      coupon: order.coupon
        ? {
            id: order.coupon.id,
            code: order.coupon.code,
            discountType: order.coupon.discountType,
            discountValue: order.coupon.discountValue,
          }
        : null,
      items: items.map((it) => ({
        id: it.id,
        courseId: it.courseId,
        title: it.titleSnapshot,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
      })),
    };
  }

  async updateOrder(id: string, dto: UpdateOrderStatusDto) {
    const repo = this.dataSource.getRepository(Order);
    const order = await repo.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const becomingPaid =
      dto.status === order_status.PAID && order.status !== order_status.PAID;

    order.status = dto.status;
    if (becomingPaid && !order.paidAt) {
      order.paidAt = new Date();
    }
    await repo.save(order);

    if (becomingPaid) {
      await this.createEnrollmentsForOrder(order);
    }

    return this.getOrder(id);
  }

  async refundOrder(id: string) {
    await this.dataSource.transaction(async (manager) => {
      const orderRepo = manager.getRepository(Order);
      const order = await orderRepo.findOne({ where: { id } });
      if (!order) {
        throw new NotFoundException('Order not found');
      }
      order.status = order_status.REFUNDED;
      await orderRepo.save(order);

      await manager
        .getRepository(Enrollment)
        .update(
          { orderId: id },
          { status: enrollment_status.CANCELLED },
        );
    });

    return this.getOrder(id);
  }

  // ── enrollments (read-only ledger) ───────────────────────────────────
  async listEnrollments(query: AdminEnrollmentQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource
      .getRepository(Enrollment)
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'u')
      .leftJoinAndSelect('e.course', 'c');

    if (query.search) {
      qb.andWhere('(u.fullName ILIKE :s OR c.title ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    qb.orderBy('e.enrolledAt', 'DESC');

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const items = rows.map((e) => ({
      id: e.id,
      student: e.user?.fullName ?? null,
      course: e.course?.title ?? null,
      progressPercent: e.progressPercent,
      status: e.status,
      enrolledAt: e.enrolledAt,
    }));
    return { items, meta: this.meta(page, total) };
  }

  // ── coupons ──────────────────────────────────────────────────────────
  async listCoupons(query: AdminCouponQueryDto) {
    const { page, skip } = this.resolvePage(query.page);
    const qb = this.dataSource.getRepository(Coupon).createQueryBuilder('cp');

    if (query.search) {
      qb.andWhere('cp.code ILIKE :s', { s: `%${query.search}%` });
    }
    qb.orderBy('cp.createdAt', 'DESC');

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();
    const items = rows.map((cp) => this.mapCoupon(cp));
    return { items, meta: this.meta(page, total) };
  }

  async createCoupon(dto: CreateAdminCouponDto) {
    const repo = this.dataSource.getRepository(Coupon);
    const existing = await repo.findOne({ where: { code: dto.code } });
    if (existing) {
      throw new ConflictException(
        `A coupon with code "${dto.code}" already exists!`,
      );
    }

    const coupon = repo.create({
      code: dto.code,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxUses: dto.maxUses ?? 0,
      usedCount: 0,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      isActive: dto.isActive ?? true,
    });
    const saved = await repo.save(coupon);
    return this.mapCoupon(saved);
  }

  async updateCoupon(id: string, dto: UpdateAdminCouponDto) {
    const repo = this.dataSource.getRepository(Coupon);
    const coupon = await repo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.code !== undefined) coupon.code = dto.code;
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      coupon.discountValue = dto.discountValue;
    if (dto.maxUses !== undefined) coupon.maxUses = dto.maxUses;
    if (dto.validFrom !== undefined)
      coupon.validFrom = dto.validFrom ? new Date(dto.validFrom) : undefined;
    if (dto.validUntil !== undefined)
      coupon.validUntil = dto.validUntil ? new Date(dto.validUntil) : undefined;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;

    const saved = await repo.save(coupon);
    return this.mapCoupon(saved);
  }

  async deleteCoupon(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(Coupon);
    const coupon = await repo.findOne({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    const usedByOrder = await this.dataSource
      .getRepository(Order)
      .count({ where: { couponId: id } });

    if (coupon.usedCount > 0 || usedByOrder > 0) {
      // Never hard-delete a coupon that has been used — deactivate it instead.
      coupon.isActive = false;
      await repo.save(coupon);
      return;
    }

    await repo.delete(id);
  }

  // ── helpers ──────────────────────────────────────────────────────────
  private async createEnrollmentsForOrder(order: Order): Promise<void> {
    const items = await this.dataSource
      .getRepository(OrderItem)
      .find({ where: { orderId: order.id } });
    const enrollmentRepo = this.dataSource.getRepository(Enrollment);
    const courseRepo = this.dataSource.getRepository(Course);

    for (const item of items) {
      const existing = await enrollmentRepo.findOne({
        where: { userId: order.userId, courseId: item.courseId },
      });
      if (existing) {
        if (existing.status === enrollment_status.CANCELLED) {
          existing.status = enrollment_status.ACTIVE;
          existing.orderId = order.id;
          await enrollmentRepo.save(existing);
        }
        continue;
      }

      const enrollment = enrollmentRepo.create({
        userId: order.userId,
        courseId: item.courseId,
        orderId: order.id,
        status: enrollment_status.ACTIVE,
        progressPercent: 0,
        enrolledAt: new Date(),
      });
      await enrollmentRepo.save(enrollment);
      await courseRepo.increment({ id: item.courseId }, 'studentCount', 1);
    }
  }

  private async recomputeCourseProgress(courseId: string): Promise<void> {
    const lessonRepo = this.dataSource.getRepository(Lesson);
    const enrollmentRepo = this.dataSource.getRepository(Enrollment);

    const totalLessons = await lessonRepo
      .createQueryBuilder('l')
      .innerJoin('l.section', 's')
      .where('s.courseId = :courseId', { courseId })
      .getCount();

    const enrollments = await enrollmentRepo.find({ where: { courseId } });
    for (const enrollment of enrollments) {
      if (enrollment.status === enrollment_status.CANCELLED) continue;

      let percent = 0;
      if (totalLessons > 0) {
        const completed = await this.dataSource
          .getRepository(LessonProgress)
          .createQueryBuilder('lp')
          .innerJoin('lp.lesson', 'l')
          .innerJoin('l.section', 's')
          .where('lp.enrollmentId = :eid', { eid: enrollment.id })
          .andWhere('lp.isCompleted = true')
          .andWhere('s.courseId = :courseId', { courseId })
          .getCount();
        percent = Math.round((completed / totalLessons) * 100);
      }

      const status =
        percent >= 100
          ? enrollment_status.COMPLETED
          : enrollment_status.ACTIVE;
      await enrollmentRepo.update(enrollment.id, {
        progressPercent: percent,
        status,
      });
    }
  }

  private mapLesson(lesson: Lesson) {
    return {
      id: lesson.id,
      sectionId: lesson.sectionId,
      title: lesson.title,
      contentType: lesson.contentType,
      videoUrl: lesson.videoUrl ?? null,
      content: lesson.content ?? null,
      durationMinutes: lesson.durationMinutes,
      displayOrder: lesson.displayOrder,
      isPreview: lesson.isPreview,
      isPublished: lesson.isPublished,
    };
  }

  private mapCategory(category: Category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      iconUrl: category.iconUrl ?? null,
      description: category.description ?? null,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
    };
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      headline: user.headline ?? null,
      country: user.country ?? null,
      createdAt: user.createdAt,
    };
  }

  private mapCoupon(coupon: Coupon) {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      usedCount: coupon.usedCount,
      maxUses: coupon.maxUses,
      validFrom: coupon.validFrom ?? null,
      validUntil: coupon.validUntil ?? null,
      isActive: coupon.isActive,
    };
  }

  private slugify(input: string): string {
    const slug = input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);
    return slug || 'course';
  }

  private resolvePage(page?: number): { page: number; skip: number } {
    const current = page && page > 0 ? page : 1;
    return { page: current, skip: (current - 1) * PAGE_SIZE };
  }

  private meta(page: number, total: number) {
    return { page, page_size: PAGE_SIZE, total };
  }
}
