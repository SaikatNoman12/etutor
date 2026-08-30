import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './cart.entity';
import { CartItem } from '../cart-item/cart-item.entity';
import { Coupon } from '../coupon/coupon.entity';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';
import { CartManagementService } from './cart-management.service';
import { CartController } from './cart.controller';
import { CartManagementController } from './cart-management.controller';
import { CartItemModule } from '../cart-item/cart-item.module';
import { CouponModule } from '../coupon/coupon.module';
import { CourseModule } from '../course/course.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

/**
 * Cart module. Registers the cart's own entity plus the sibling entities the
 * customer-facing cart reads (cart_item, coupon, course, enrollment) via
 * TypeOrmModule.forFeature — this gives CartManagementService their repositories
 * without importing the sibling modules, so the cart module stays decoupled from
 * their providers. Exports CartService/CartRepository for cross-module use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem, Coupon, Course, Enrollment]),
    // CartManagementService composes against these modules' own repositories — forFeature
    // provides Repository<T>, not the custom *Repository classes.
    CartItemModule,
    CouponModule,
    CourseModule,
    EnrollmentModule,
  ],
  controllers: [CartController, CartManagementController],
  providers: [CartService, CartRepository, CartManagementService],
  exports: [CartService, CartRepository, CartManagementService, TypeOrmModule],
})
export class CartModule {}
