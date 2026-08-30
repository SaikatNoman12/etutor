import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Coupon } from './coupon.entity';
import { CouponRepository } from './coupon.repository';
import { CouponService } from './coupon.service';
import { CouponController } from './coupon.controller';
import { AdminCouponsController } from './admin-coupons.controller';

/**
 * Coupon module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Coupon])],
  controllers: [CouponController, AdminCouponsController],
  providers: [CouponService, CouponRepository],
  exports: [CouponService, CouponRepository, TypeOrmModule],
})
export class CouponModule {}
