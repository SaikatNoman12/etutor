import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { Lesson } from './lesson.entity';
import { LessonRepository } from './lesson.repository';

/**
 * Lesson service — generated. Extends BaseService<Lesson> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<Lesson>` directly — go through this.repository
 * (the LessonRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class LessonService extends BaseService<Lesson> {
  constructor(protected readonly repository: LessonRepository) {
    super(repository, 'Lesson');
  }
}
