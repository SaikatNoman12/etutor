import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { Enrollment } from './enrollment.entity';

/**
 * Enrollment repository — generated. Extends BaseRepository<Enrollment> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class EnrollmentRepository extends BaseRepository<Enrollment> {
  constructor(
    @InjectRepository(Enrollment)
    repository: Repository<Enrollment>,
  ) {
    super(repository);
  }

  /** The single enrollment a student holds for a course, if any (UNIQUE user_id+course_id). */
  async findForUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return this.findOne({ where: { userId, courseId } });
  }

  /** Does this student already own the course? Used to keep it out of the cart. */
  async countForUserAndCourse(userId: string, courseId: string): Promise<number> {
    return this.count({ where: { userId, courseId } });
  }
}
