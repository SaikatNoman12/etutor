import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BaseService } from '../../core/base/base.service';
import { Enrollment } from './enrollment.entity';
import { EnrollmentRepository } from './enrollment.repository';
import { Course } from '../course/course.entity';
import { CourseRepository } from '../course/course.repository';
import { CourseSection } from '../course-section/course-section.entity';
import { CourseSectionRepository } from '../course-section/course-section.repository';
import { Lesson } from '../lesson/lesson.entity';
import { LessonRepository } from '../lesson/lesson.repository';
import { LessonProgress } from '../lesson-progress/lesson-progress.entity';
import { LessonProgressRepository } from '../lesson-progress/lesson-progress.repository';
import { enrollment_status } from '../../common/enums/enrollment-status.enum';
import { RoleEnum, ROLE_VALUES } from '../../common/enums/role.enum';

/** A v4-shaped uuid; anything else on the player route is a course slug. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One row of GET /api/enrollments — the "My learning" list. */
export interface EnrollmentListItem {
  id: string;
  course: { title: string; slug: string; thumbnailUrl: string | null } | null;
  progressPercent: number;
  status: enrollment_status;
}

/** GET /api/enrollments — the session user's enrollments, most recently touched first. */
export interface EnrollmentListView {
  items: EnrollmentListItem[];
}

/**
 * One lesson row inside the course player.
 *
 * camelCase, like every other response this API returns. These three fields
 * used to be `content_type` / `duration_minutes` / `is_completed` — inside the
 * same JSON object whose `course` carried `thumbnailUrl` — so the player page,
 * written against the app's normal casing, read `lesson.isCompleted` and
 * `lesson.durationMinutes` and got `undefined` for both: no completion tick,
 * no duration, on every lesson in the list.
 */
export interface PlayerLessonView {
  id: string;
  title: string;
  contentType: number;
  durationMinutes: number;
  isCompleted: boolean;
  /** What the stage plays or shows. The entity had both columns and the
   *  console's own lesson endpoints returned them; this projection did not, so
   *  the player — the one screen that exists to show a lesson — had a title, a
   *  duration and a grey rectangle. */
  videoUrl: string | null;
  content: string | null;
}

/** One section (with its published lessons) inside the course player. */
export interface PlayerSectionView {
  id: string;
  title: string;
  lessons: PlayerLessonView[];
}

/** GET /api/enrollments/:id — the course player payload. */
export interface PlayerView {
  course: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    thumbnailUrl: string | null;
  } | null;
  sections: PlayerSectionView[];
  progressPercent: number;
}

/**
 * EnrollmentService — the learning feature. An enrollment is the access record:
 * "My learning" lists the session user's enrollments, the player renders a
 * course's sections + published lessons with per-lesson completion, and
 * completing a lesson upserts lesson_progress, recomputes progress_percent and
 * flips the enrollment to ENROLL_COMPLETED at 100%. Every read/write is scoped
 * to the session user (ADMIN bypasses the scope); a CANCELLED enrollment is 403.
 * The course / section / lesson / lesson_progress repositories are injected via
 * TypeOrmModule.forFeature so the module stays decoupled from its siblings'
 * providers (same convention as the order module).
 */
@Injectable()
export class EnrollmentService extends BaseService<Enrollment> {
  constructor(
    protected readonly repository: EnrollmentRepository,
    // Sibling modules' own repositories — each query lives with the data it belongs to.
    private readonly courses: CourseRepository,
    private readonly sections: CourseSectionRepository,
    private readonly lessons: LessonRepository,
    private readonly progress: LessonProgressRepository,
  ) {
    super(repository, 'Enrollment');
  }

  private isAdmin(role: unknown): boolean {
    return role === RoleEnum.admin || Number(role) === ROLE_VALUES.admin;
  }

  private assertOwner(
    enrollment: Enrollment,
    userId: string,
    role: unknown,
  ): void {
    if (!this.isAdmin(role) && enrollment.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this enrollment!',
      );
    }
  }

  private assertActive(enrollment: Enrollment): void {
    if (enrollment.status === enrollment_status.CANCELLED) {
      throw new ForbiddenException(
        'This enrollment has been cancelled and can no longer be accessed!',
      );
    }
  }

  /** The published lessons of a course, plus its sections, both display-ordered. */
  private async sectionsAndPublishedLessons(
    courseId: string,
  ): Promise<{ sections: CourseSection[]; lessons: Lesson[] }> {
    const sections = await this.sections.findByCourseOrdered(courseId);
    if (sections.length === 0) {
      return { sections, lessons: [] };
    }
    const lessons = await this.lessons.findPublishedBySections(
      sections.map((sec) => sec.id),
    );
    return { sections, lessons };
  }

  private computePercent(completed: number, total: number): number {
    if (total <= 0) {
      return 0;
    }
    return Math.min(100, Math.round((completed / total) * 100));
  }

  /** The session user's enrollments (ADMIN sees all), most recently touched first. */
  async listForUser(userId: string, role: unknown): Promise<EnrollmentListView> {
    const rows = await this.repository.findAll({
      where: this.isAdmin(role) ? {} : { userId },
      relations: { course: true },
      order: { updatedAt: 'DESC' },
    });

    const items: EnrollmentListItem[] = rows.map((e) => ({
      id: e.id,
      course: e.course
        ? {
            title: e.course.title,
            slug: e.course.slug,
            thumbnailUrl: e.course.thumbnailUrl ?? null,
          }
        : null,
      progressPercent: e.progressPercent,
      status: e.status,
    }));

    return { items };
  }

  /**
   * Which enrollment is this — ONE answer, for every route that takes `:id`.
   *
   * The player is reached by the course slug (/learn/:slug is the URL the design
   * declares), so `:id` is a uuid OR a slug. `getPlayer` learned that; the
   * complete-lesson route did not — it kept a `ParseUUIDPipe` and called
   * `findByIdOrFail` directly, so the very id the GET had just accepted was
   * rejected by the POST with "Validation failed (uuid is expected)". Marking a
   * lesson complete answered 400 for every student, on the one action the
   * learning feature exists for.
   */
  private async resolveOwned(
    idOrSlug: string,
    userId: string,
    role: unknown,
  ): Promise<Enrollment> {
    const enrollment = UUID_RE.test(idOrSlug)
      ? await this.findByIdOrFail(idOrSlug, { course: true })
      : await this.findByCourseSlugOrFail(idOrSlug, userId);
    this.assertOwner(enrollment, userId, role);
    this.assertActive(enrollment);
    return enrollment;
  }

  /** The course player payload; 404 unknown, 403 for another user's or a cancelled enrollment. */
  /** The caller's enrollment in the course with this slug. */
  private async findByCourseSlugOrFail(slug: string, userId: string) {
    const course = await this.courses.findOne({ where: { slug } });
    if (!course) throw new NotFoundException(`No course with slug ${slug}`);
    const enrollment = await this.repository.findOne({
      where: { courseId: course.id, userId },
      relations: { course: true },
    });
    if (!enrollment) {
      throw new NotFoundException(`You are not enrolled in ${slug}`);
    }
    return enrollment;
  }

  async getPlayerForUser(
    id: string,
    userId: string,
    role: unknown,
  ): Promise<PlayerView> {
    const enrollment = await this.resolveOwned(id, userId, role);
    id = enrollment.id;

    const { sections, lessons } = await this.sectionsAndPublishedLessons(
      enrollment.courseId,
    );
    const completed = await this.progress.findCompleted(id);
    const completedLessonIds = new Set(completed.map((r) => r.lessonId));

    const sectionViews: PlayerSectionView[] = sections.map((s) => ({
      id: s.id,
      title: s.title,
      lessons: lessons
        .filter((l) => l.sectionId === s.id)
        .map((l) => ({
          id: l.id,
          title: l.title,
          contentType: l.contentType,
          durationMinutes: l.durationMinutes,
          isCompleted: completedLessonIds.has(l.id),
          videoUrl: l.videoUrl ?? null,
          content: l.content ?? null,
        })),
    }));

    const course = enrollment.course;
    return {
      course: course
        ? {
            id: course.id,
            title: course.title,
            slug: course.slug,
            summary: course.summary ?? null,
            thumbnailUrl: course.thumbnailUrl ?? null,
          }
        : null,
      sections: sectionViews,
      progressPercent: enrollment.progressPercent,
    };
  }

  /**
   * Mark a lesson complete: upsert lesson_progress, recompute progress_percent
   * against the course's published-lesson count, and flip the enrollment to
   * ENROLL_COMPLETED at 100%. 403 for another user's or a cancelled enrollment,
   * 404 when the lesson is unknown or does not belong to the enrolled course.
   */
  async completeLesson(
    id: string,
    lessonId: string,
    userId: string,
    role: unknown,
  ): Promise<PlayerView> {
    const enrollment = await this.resolveOwned(id, userId, role);
    id = enrollment.id;

    // The lesson must exist and belong to the enrolled course.
    const lesson = await this.lessons.findWithSection(lessonId);
    if (!lesson || lesson.section?.courseId !== enrollment.courseId) {
      throw new NotFoundException('Lesson not found');
    }

    // Upsert lesson_progress → completed (idempotent on a repeated complete).
    const existing = await this.progress.findForLesson(id, lessonId);
    if (existing) {
      if (!existing.isCompleted) {
        await this.progress.update(existing.id, {
          isCompleted: true,
          completedAt: new Date(),
        });
      }
    } else {
      await this.progress.create({
        enrollmentId: id,
        lessonId,
        isCompleted: true,
        watchedSeconds: 0,
        completedAt: new Date(),
      });
    }

    // Recompute against the CURRENTLY published lessons (denominator can shift
    // as an instructor publishes/unpublishes lessons).
    const { lessons } = await this.sectionsAndPublishedLessons(
      enrollment.courseId,
    );
    const publishedLessonIds = new Set(lessons.map((l) => l.id));
    const completedRows = await this.progress.findCompleted(id);
    const completedCount = completedRows.filter((r) =>
      publishedLessonIds.has(r.lessonId),
    ).length;
    const percent = this.computePercent(completedCount, lessons.length);

    const patch: Partial<Enrollment> = {
      progressPercent: percent,
      lastLessonId: lessonId,
    };
    if (percent >= 100) {
      patch.status = enrollment_status.COMPLETED;
      patch.completedAt = new Date();
    }
    await this.repository.update(id, patch);

    return this.getPlayerForUser(id, userId, role);
  }
}
