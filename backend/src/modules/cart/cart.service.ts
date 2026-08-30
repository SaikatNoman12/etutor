import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { Cart } from './cart.entity';
import { CartRepository } from './cart.repository';

export interface CartPage {
  items: Cart[];
  meta: { page: number; page_size: number; total: number };
}

/**
 * Cart service — the thin BaseService<Cart> covering create/findById/findAll/
 * update/remove for the generic /carts CRUD surface. Constructor arity stays 1
 * (repository only) so the scaffolded unit test — `new CartService(mockRepo)` —
 * keeps compiling; cross-entity cart business logic lives in
 * CartManagementService, not here.
 */
@Injectable()
export class CartService extends BaseService<Cart> {
  constructor(protected readonly repository: CartRepository) {
    super(repository, 'Cart');
  }

  /** Page carts as { items, meta: { page, page_size, total } } for GET /api/carts. */
  async paginate(page = 1, pageSize = 10): Promise<CartPage> {
    const [items, total] = await Promise.all([
      this.repository.findAll({ skip: (page - 1) * pageSize, take: pageSize }),
      this.repository.count(),
    ]);
    return { items, meta: { page, page_size: pageSize, total } };
  }
}
