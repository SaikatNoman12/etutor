import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { LessonProgress } from './lesson-progress.entity';
import { LessonProgressRepository } from './lesson-progress.repository';

/**
 * LessonProgress service — generated. Extends BaseService<LessonProgress> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<LessonProgress>` directly — go through this.repository
 * (the LessonProgressRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class LessonProgressService extends BaseService<LessonProgress> {
  constructor(protected readonly repository: LessonProgressRepository) {
    super(repository, 'LessonProgress');
  }
}
