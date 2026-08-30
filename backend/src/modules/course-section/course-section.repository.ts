import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { CourseSection } from './course-section.entity';

/**
 * CourseSection repository — generated. Extends BaseRepository<CourseSection> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class CourseSectionRepository extends BaseRepository<CourseSection> {
  constructor(
    @InjectRepository(CourseSection)
    repository: Repository<CourseSection>,
  ) {
    super(repository);
  }

  /** A course's sections in syllabus order. */
  async findByCourseOrdered(courseId: string): Promise<CourseSection[]> {
    return this.findAll({ where: { courseId }, order: { displayOrder: 'ASC' } });
  }
}
