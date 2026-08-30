import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { CourseSection } from './course-section.entity';
import { CourseSectionRepository } from './course-section.repository';

/**
 * CourseSection service — generated. Extends BaseService<CourseSection> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<CourseSection>` directly — go through this.repository
 * (the CourseSectionRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class CourseSectionService extends BaseService<CourseSection> {
  constructor(protected readonly repository: CourseSectionRepository) {
    super(repository, 'CourseSection');
  }
}
