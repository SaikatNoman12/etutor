import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { OrderItem } from './order-item.entity';
import { OrderItemRepository } from './order-item.repository';

/**
 * OrderItem service — generated. Extends BaseService<OrderItem> for the
 * standard create/findById/findAll/update/remove operations.
 *
 * Add domain-specific methods here:
 *   - Cross-entity orchestration (e.g. assignTo, transition state)
 *   - Business rules / invariants
 *   - Bulk operations
 *
 * NEVER inject `Repository<OrderItem>` directly — go through this.repository
 * (the OrderItemRepository instance) so caching, soft-delete, and tenant
 * scoping stay consistent.
 */
@Injectable()
export class OrderItemService extends BaseService<OrderItem> {
  constructor(protected readonly repository: OrderItemRepository) {
    super(repository, 'OrderItem');
  }
}
