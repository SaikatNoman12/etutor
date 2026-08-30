import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { Cart } from './cart.entity';

/**
 * Cart repository — generated. Extends BaseRepository<Cart> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class CartRepository extends BaseRepository<Cart> {
  constructor(
    @InjectRepository(Cart)
    repository: Repository<Cart>,
  ) {
    super(repository);
  }

  /** The one cart a user owns (UNIQUE user_id), or null before first access. */
  async findByUser(userId: string): Promise<Cart | null> {
    return this.findOne({ where: { userId } });
  }
}
