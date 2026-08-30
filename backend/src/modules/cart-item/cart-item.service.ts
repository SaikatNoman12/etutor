import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { CartItem } from './cart-item.entity';
import { CartItemRepository } from './cart-item.repository';

/**
 * CartItem service — generated. Extends BaseService<CartItem> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<CartItem>` directly — go through this.repository
 * (the CartItemRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class CartItemService extends BaseService<CartItem> {
  constructor(protected readonly repository: CartItemRepository) {
    super(repository, 'CartItem');
  }
}
