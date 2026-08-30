import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { OrderItem } from './order-item.entity';

/**
 * OrderItem repository — generated. Extends BaseRepository<OrderItem> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class OrderItemRepository extends BaseRepository<OrderItem> {
  constructor(
    @InjectRepository(OrderItem)
    repository: Repository<OrderItem>,
  ) {
    super(repository);
  }

  /** Every line of one order. */
  async findByOrder(orderId: string): Promise<OrderItem[]> {
    return this.findAll({ where: { orderId } });
  }

  /** How many lines one order has (list view's item count). */
  async countByOrder(orderId: string): Promise<number> {
    return this.count({ where: { orderId } });
  }
}
