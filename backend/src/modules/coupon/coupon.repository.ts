import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseRepository } from '../../core/base/base.repository';
import { Coupon } from './coupon.entity';

/**
 * Coupon repository — generated. Extends BaseRepository<Coupon> for
 * standard CRUD (findById, findAll, create, update, softDelete). Add custom
 * query methods here as the project needs them (e.g. findByEmail,
 * findActiveByOrgId). Do not modify the inherited methods.
 */
@Injectable()
export class CouponRepository extends BaseRepository<Coupon> {
  constructor(
    @InjectRepository(Coupon)
    repository: Repository<Coupon>,
  ) {
    super(repository);
  }

  /** Look a coupon up by the code a shopper types. */
  async findByCode(code: string): Promise<Coupon | null> {
    return this.findOne({ where: { code } });
  }
}
