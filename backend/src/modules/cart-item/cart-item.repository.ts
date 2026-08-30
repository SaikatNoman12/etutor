import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { CartItem } from './cart-item.entity';

/**
 * CartItem repository — generated. Extends BaseRepository<CartItem> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class CartItemRepository extends BaseRepository<CartItem> {
  constructor(
    @InjectRepository(CartItem)
    repository: Repository<CartItem>,
  ) {
    super(repository);
  }

  /** A cart's lines, optionally with the course (and its category) the view renders. */
  async findByCart(cartId: string, withCourse = false): Promise<CartItem[]> {
    return this.findAll({
      where: { cartId },
      ...(withCourse ? { relations: { course: { category: true } } } : {}),
    });
  }

  /** The line holding one course in one cart, if it is already there. */
  async findLine(cartId: string, courseId: string): Promise<CartItem | null> {
    return this.findOne({ where: { cartId, courseId } });
  }

  /** Empty a cart. BaseRepository.delete takes an id; emptying is a criteria delete. */
  async deleteByCart(cartId: string): Promise<void> {
    await this.repository.delete({ cartId });
  }
}
