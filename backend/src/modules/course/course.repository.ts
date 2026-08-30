import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { Course } from './course.entity';

/**
 * Course repository — generated. Extends BaseRepository<Course> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class CourseRepository extends BaseRepository<Course> {
  constructor(
    @InjectRepository(Course)
    repository: Repository<Course>,
  ) {
    super(repository);
  }
}
