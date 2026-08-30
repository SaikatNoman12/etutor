import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../core/base/base.service';
import { Course } from './course.entity';
import { CourseRepository } from './course.repository';
import { CourseSectionRepository } from '../course-section/course-section.repository';
import { Lesson } from '../lesson/lesson.entity';
import { LessonRepository } from '../lesson/lesson.repository';
import { CreateLessonDto } from '../lesson/dtos/create-lesson.dto';

/**
 * Course service — extends BaseService<Course> for the standard
 * create/findById/findAll/update/remove operations, plus the course-editor
 * business logic the admin course-detail screen needs.
 *
 * `addLesson` backs POST /api/admin/courses/:id/lessons (US-ADM-03 AC-3): a
 * lesson lives under a section, so the section / lesson repositories are
 * injected via TypeOrmModule.forFeature — the same convention EnrollmentService
 * uses — rather than coupling to the sibling modules' providers.
 *
 * NEVER inject `Repository<Course>` directly — go through this.repository
 * (the CourseRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class CourseService extends BaseService<Course> {
  constructor(
    protected readonly repository: CourseRepository,
    // The sibling modules' OWN repositories, not raw TypeORM handles: a service that reaches
    // another entity should go through that entity's abstraction, so the query lives with the
    // data it belongs to and is testable on its own.
    private readonly sections: CourseSectionRepository,
    private readonly lessons: LessonRepository,
  ) {
    super(repository, 'Course');
  }

  /**
   * Add a lesson to one of a course's sections (admin course editor).
   * Verifies the course exists and that the target section belongs to it, then
   * resolves the lesson's position: an omitted order appends after the current
   * last lesson; a position that is already taken renumbers the rest up by one
   * rather than duplicating a slot (US-ADM-03 boundary case).
   */
  async addLesson(courseId: string, dto: CreateLessonDto): Promise<Lesson> {
    await this.findByIdOrFail(courseId);

    const section = await this.sections.findById(dto.sectionId);
    if (!section) {
      throw new NotFoundException(`Section ${dto.sectionId} not found`);
    }
    if (section.courseId !== courseId) {
      throw new BadRequestException('Section does not belong to this course');
    }

    const siblings = await this.lessons.findBySectionOrdered(section.id);

    let displayOrder: number;
    if (dto.displayOrder === undefined || dto.displayOrder === null) {
      displayOrder = siblings.length
        ? Math.max(...siblings.map((l) => l.displayOrder)) + 1
        : 0;
    } else {
      displayOrder = dto.displayOrder;
      if (siblings.some((l) => l.displayOrder === displayOrder)) {
        for (const l of siblings) {
          if (l.displayOrder >= displayOrder) {
            await this.lessons.update(l.id, {
              displayOrder: l.displayOrder + 1,
            });
          }
        }
      }
    }

    // BaseRepository.create builds AND persists — the create/save pair collapses to one call.
    return this.lessons.create({
      ...dto,
      sectionId: section.id,
      displayOrder,
    });
  }
}
