import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { Category } from './category.entity';
import { CategoryRepository } from './category.repository';

/**
 * Category service — generated. Extends BaseService<Category> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<Category>` directly — go through this.repository
 * (the CategoryRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class CategoryService extends BaseService<Category> {
  constructor(protected readonly repository: CategoryRepository) {
    super(repository, 'Category');
  }
}
