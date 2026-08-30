import { Injectable } from '@nestjs/common';
import { BaseService } from '../../core/base/base.service';
import { Coupon } from './coupon.entity';
import { CouponRepository } from './coupon.repository';

export interface CouponPage {
  items: Coupon[];
  meta: { page: number; page_size: number; total: number };
}

/**
 * Coupon service — the thin BaseService<Coupon> covering create/findById/findAll/
 * update/remove for the generic /coupons CRUD surface. Constructor arity stays 1
 * (repository only) so the scaffolded unit test — `new CouponService(mockRepo)` —
 * keeps compiling. Admin coupon business rules (duplicate-code guard,
 * deactivate-if-used) live in AdminConsoleService, not here.
 */
@Injectable()
export class CouponService extends BaseService<Coupon> {
  constructor(protected readonly repository: CouponRepository) {
    super(repository, 'Coupon');
  }

  /** Page coupons as { items, meta: { page, page_size, total } } for GET /api/coupons. */
  async paginate(page = 1, pageSize = 10): Promise<CouponPage> {
    const [items, total] = await Promise.all([
      this.repository.findAll({ skip: (page - 1) * pageSize, take: pageSize }),
      this.repository.count(),
    ]);
    return { items, meta: { page, page_size: pageSize, total } };
  }
}
