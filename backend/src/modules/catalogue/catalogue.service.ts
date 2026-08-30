import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, In } from 'typeorm';

import { Category } from '../category/category.entity';
import { Course } from '../course/course.entity';
import { CourseSection } from '../course-section/course-section.entity';
import { Lesson } from '../lesson/lesson.entity';
import { User } from '../user/user.entity';

import { course_status } from '../../common/enums/course-status.enum';
import { user_role } from '../../common/enums/user-role.enum';

import {
  CatalogueCategoryQueryDto,
  CatalogueCourseQueryDto,
  CatalogueInstructorQueryDto,
} from './dtos';

const PAGE_SIZE = 12;

/**
 * CatalogueService — the public, read-only storefront (categories, published
 * courses, one course by slug, instructors and their profiles). It spans
 * several entities (category, course, course_section, lesson, user), so — like
 * the canonical DashboardService / AdminConsoleService — it injects the
 * DataSource and reaches each entity's Repository directly rather than
 * extending single-entity BaseService. Only PUBLISHED courses (and the
 * instructors who own one) ever reach these methods; every method returns a
 * mapped camelCase projection, never a raw entity.
 */
@Injectable()
export class CatalogueService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  // ── categories ─────────────────────────────────────────────────────────
  /** Active categories in display order, each with its published-course count. */
  async listCategories(query: CatalogueCategoryQueryDto) {
    const categoryRepo = this.dataSource.getRepository(Category);
    const courseRepo = this.dataSource.getRepository(Course);

    // Default view is the active catalogue; `active=false` inspects the rest.
    const isActive = query.active === undefined ? true : query.active;

    const categories = await categoryRepo.find({
      where: { isActive },
      order: { displayOrder: 'ASC', name: 'ASC' },
    });

    const items = await Promise.all(
      categories.map(async (c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        iconUrl: c.iconUrl ?? null,
        description: c.description ?? null,
        displayOrder: c.displayOrder,
        isActive: c.isActive,
        courseCount: await courseRepo.count({
          where: { categoryId: c.id, status: course_status.PUBLISHED },
        }),
      })),
    );

    return { items };
  }

  // ── courses ────────────────────────────────────────────────────────────
  /** Paginated published courses, filtered by search / category / level and sorted. */
  async listCourses(query: CatalogueCourseQueryDto) {
    const { page, skip } = this.resolvePage(query.page);

    const qb = this.dataSource
      .getRepository(Course)
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.category', 'cat')
      .where('c.status = :st', { st: course_status.PUBLISHED });

    if (query.search) {
      qb.andWhere('(c.title ILIKE :s OR c.summary ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.category) {
      qb.andWhere('cat.slug = :cat', { cat: query.category });
    }
    if (query.level !== undefined) {
      qb.andWhere('c.level = :lv', { lv: query.level });
    }

    switch (query.sort) {
      case 'newest':
        qb.orderBy('c.publishedAt', 'DESC');
        break;
      case 'price_asc':
        qb.orderBy('c.price', 'ASC');
        break;
      case 'price_desc':
        qb.orderBy('c.price', 'DESC');
        break;
      case 'popular':
      default:
        qb.orderBy('c.studentCount', 'DESC');
    }

    const [rows, total] = await qb.skip(skip).take(PAGE_SIZE).getManyAndCount();

    const items = rows.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      category: c.category?.name ?? null,
      price: c.price,
      compareAtPrice: c.compareAtPrice ?? null,
      level: c.level,
      ratingAvg: c.ratingAvg,
      studentCount: c.studentCount,
      thumbnailUrl: c.thumbnailUrl ?? null,
    }));

    return { items, meta: this.meta(page, total) };
  }

  /** One published course with its sections, published lessons and instructor. */
  async getCourseBySlug(slug: string) {
    const course = await this.dataSource.getRepository(Course).findOne({
      where: { slug, status: course_status.PUBLISHED },
      relations: { category: true, instructor: true },
    });
    if (!course) {
      throw new NotFoundException(`Course '${slug}' not found!`);
    }

    const sections = await this.dataSource
      .getRepository(CourseSection)
      .find({ where: { courseId: course.id }, order: { displayOrder: 'ASC' } });

    const sectionIds = sections.map((s) => s.id);
    const lessons = sectionIds.length
      ? await this.dataSource.getRepository(Lesson).find({
          where: { sectionId: In(sectionIds), isPublished: true },
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
      ratingAvg: course.ratingAvg,
      ratingCount: course.ratingCount,
      studentCount: course.studentCount,
      publishedAt: course.publishedAt ?? null,
      category: course.category
        ? { name: course.category.name, slug: course.category.slug }
        : null,
      instructor: course.instructor
        ? {
            id: course.instructor.id,
            name: course.instructor.fullName,
            headline: course.instructor.headline ?? null,
            avatarUrl: course.instructor.avatarUrl ?? null,
          }
        : null,
      sections: sections.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary ?? null,
        displayOrder: s.displayOrder,
        lessons: lessons
          .filter((l) => l.sectionId === s.id)
          .map((l) => ({
            id: l.id,
            title: l.title,
            contentType: l.contentType,
            durationMinutes: l.durationMinutes,
            isPreview: l.isPreview,
            displayOrder: l.displayOrder,
          })),
      })),
    };
  }

  // ── instructors ────────────────────────────────────────────────────────
  /** Instructors (role 2) with a published course, sorted by student reach. */
  async listInstructors(query: CatalogueInstructorQueryDto) {
    const courseRepo = this.dataSource.getRepository(Course);

    const qb = this.dataSource
      .getRepository(User)
      .createQueryBuilder('u')
      .where('u.role = :role', { role: user_role.INSTRUCTOR });

    if (query.search) {
      qb.andWhere('(u.fullName ILIKE :s OR u.headline ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }

    const instructors = await qb.getMany();

    const items: Array<{
      id: string;
      name: string;
      headline: string | null;
      // The directory shows a photo for each instructor; without this the card can only
      // ever draw a placeholder, however complete the data behind it is.
      avatarUrl: string | null;
      courseCount: number;
      studentCount: number;
    }> = [];

    for (const u of instructors) {
      const published = await courseRepo.find({
        where: { instructorId: u.id, status: course_status.PUBLISHED },
      });
      // Only instructors who actually have a published course reach the catalogue.
      if (!published.length) continue;
      items.push({
        id: u.id,
        name: u.fullName,
        headline: u.headline ?? null,
        avatarUrl: u.avatarUrl ?? null,
        courseCount: published.length,
        studentCount: published.reduce((sum, c) => sum + (c.studentCount ?? 0), 0),
      });
    }

    items.sort((a, b) => b.studentCount - a.studentCount);
    return { items };
  }

  /** One instructor's public profile plus the courses they have published. */
  async getInstructor(id: string) {
    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { id } });
    if (!user || user.role !== user_role.INSTRUCTOR) {
      throw new NotFoundException(`Instructor ${id} not found!`);
    }

    const published = await this.dataSource.getRepository(Course).find({
      where: { instructorId: id, status: course_status.PUBLISHED },
      relations: { category: true },
      order: { studentCount: 'DESC' },
    });

    const studentCount = published.reduce(
      (sum, c) => sum + (c.studentCount ?? 0),
      0,
    );
    const ratingAvg = published.length
      ? Number(
          (
            published.reduce((sum, c) => sum + Number(c.ratingAvg ?? 0), 0) /
            published.length
          ).toFixed(2),
        )
      : 0;

    return {
      id: user.id,
      name: user.fullName,
      headline: user.headline ?? null,
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      courseCount: published.length,
      studentCount,
      ratingAvg,
      courses: published.map((c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        category: c.category?.name ?? null,
        price: c.price,
        compareAtPrice: c.compareAtPrice ?? null,
        level: c.level,
        ratingAvg: c.ratingAvg,
        studentCount: c.studentCount,
        thumbnailUrl: c.thumbnailUrl ?? null,
      })),
    };
  }

  // ── helpers ──────────────────────────────────────────────────────────────
  private resolvePage(page?: number): { page: number; skip: number } {
    const current = page && page > 0 ? page : 1;
    return { page: current, skip: (current - 1) * PAGE_SIZE };
  }

  private meta(page: number, total: number) {
    return { page, page_size: PAGE_SIZE, total };
  }
}
