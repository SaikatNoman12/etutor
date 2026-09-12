import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { CartItem } from '../cart-item/cart-item.entity';
import { Coupon } from '../coupon/coupon.entity';
import { Course } from '../course/course.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { course_status } from '../../common/enums/course-status.enum';
import { discount_type } from '../../common/enums/discount-type.enum';
import { enrollment_status } from '../../common/enums/enrollment-status.enum';
import { CartRepository } from './cart.repository';
import { CartItemRepository } from '../cart-item/cart-item.repository';
import { CouponRepository } from '../coupon/coupon.repository';
import { CourseRepository } from '../course/course.repository';
import { EnrollmentRepository } from '../enrollment/enrollment.repository';
import { categoryRef, type CategoryRef } from '../../core/utils/category-ref';

/** Shape returned for a single cart line. */
export interface CartItemView {
  id: string;
  courseId: string;
  course: {
    title: string;
    slug: string;
    category: CategoryRef | null;
    thumbnailUrl: string | null;
  } | null;
  unitPrice: number;
  /** Always 1 — a course is bought once per learner. Sent so the client can
   *  show the truth instead of assuming; the view omitted it and the cart page
   *  fell back to `?? 1` while offering a +/− that this service quietly
   *  ignored. */
  quantity: number;
}

/** Shape returned for the whole cart. */
export interface CartView {
  id: string;
  items: CartItemView[];
  coupon: { code: string; discountType: number; discountValue: number } | null;
  subtotal: number;
  discountTotal: number;
}

/**
 * CartManagementService — the customer-facing cart behind /api/cart. One cart
 * per student, holding distinct courses at their snapshotted price. Wired to the
 * entities it needs via TypeOrmModule.forFeature (no coupling to sibling module
 * providers). Totals are always derived from the cart's lines, never trusted
 * from the client.
 */
@Injectable()
export class CartManagementService {
  constructor(
    // Each entity's OWN repository — the queries live with the data they belong to.
    private readonly carts: CartRepository,
    private readonly items: CartItemRepository,
    private readonly coupons: CouponRepository,
    private readonly courses: CourseRepository,
    private readonly enrollments: EnrollmentRepository,
  ) {}

  /** The session user's cart, created empty on first access. */
  async getOrCreateForUser(userId: string): Promise<Cart> {
    const existing = await this.carts.findByUser(userId);
    if (existing) return existing;
    // BaseRepository.create builds AND persists.
    return this.carts.create({ userId, subtotal: 0, discountTotal: 0 });
  }

  /** GET /api/cart — the cart with its lines and any applied coupon. */
  async getCartView(userId: string): Promise<CartView> {
    const cart = await this.getOrCreateForUser(userId);
    const lines = await this.items.findByCart(cart.id, true);
    const coupon = cart.couponId ? await this.coupons.findById(cart.couponId) : null;
    return this.toCartView(cart, lines, coupon);
  }

  /** POST /api/cart/items — add a published course not already owned or carted. */
  async addItem(userId: string, courseId: string): Promise<CartItemView> {
    const cart = await this.getOrCreateForUser(userId);

    const course = await this.courses.findOne({
      where: { id: courseId },
      relations: { category: true },
    });
    if (!course || course.status !== course_status.PUBLISHED) {
      throw new NotFoundException('This course is not available for purchase!');
    }

    const owned = await this.enrollments.count({
      where: {
        userId,
        courseId,
        status: In([enrollment_status.ACTIVE, enrollment_status.COMPLETED]),
      },
    });
    if (owned > 0) {
      throw new ConflictException('You already own this course!');
    }

    const already = await this.items.findLine(cart.id, courseId);
    if (already) {
      throw new ConflictException('This course is already in your cart!');
    }

    const saved = await this.items.create({
      cartId: cart.id,
      courseId,
      quantity: 1,
      unitPrice: Number(course.price),
    });
    await this.recompute(cart.id);
    return this.toItemView(saved, course);
  }

  /** PATCH /api/cart/items/:id — quantity is pinned to 1 for a course. */
  async updateItemQuantity(
    userId: string,
    itemId: string,
    _quantity: number,
  ): Promise<CartItemView> {
    const line = await this.loadOwnedLine(userId, itemId, {
      cart: true,
      course: true,
    });
    const saved = (await this.items.update(line.id, { quantity: 1 })) ?? line;
    await this.recompute(line.cartId);
    return this.toItemView(saved, saved.course);
  }

  /** DELETE /api/cart/items/:id — drop a line and recompute totals. */
  async removeItem(userId: string, itemId: string): Promise<void> {
    const line = await this.loadOwnedLine(userId, itemId, { cart: true });
    await this.items.delete(line.id);
    await this.recompute(line.cartId);
  }

  /** DELETE /api/cart — empty the cart and drop any coupon. */
  async clear(userId: string): Promise<void> {
    const cart = await this.getOrCreateForUser(userId);
    await this.items.deleteByCart(cart.id);
    await this.carts.update(cart.id, {
      subtotal: 0,
      discountTotal: 0,
      couponId: null,
    });
  }

  /** POST /api/cart/coupon — validate a coupon and apply its discount. */
  async applyCoupon(userId: string, code: string): Promise<CartView> {
    const cart = await this.getOrCreateForUser(userId);
    const coupon = await this.coupons.findByCode(code);

    // One sentence for five different causes told the shopper nothing they could
    // act on — a typo, a code that ran out and a code that starts next week all
    // read the same. Say which one it is.
    const now = new Date();
    if (!coupon) {
      throw new UnprocessableEntityException(
        `We could not find a coupon with the code "${code}".`,
      );
    }
    if (!coupon.isActive) {
      throw new UnprocessableEntityException(
        'That coupon is no longer available.',
      );
    }
    if (coupon.validFrom && coupon.validFrom > now) {
      throw new UnprocessableEntityException(
        `That coupon can be used from ${coupon.validFrom.toISOString().slice(0, 10)}.`,
      );
    }
    if (coupon.validUntil && coupon.validUntil < now) {
      throw new UnprocessableEntityException(
        `That coupon expired on ${coupon.validUntil.toISOString().slice(0, 10)}.`,
      );
    }
    if (coupon.maxUses !== 0 && coupon.usedCount >= coupon.maxUses) {
      throw new UnprocessableEntityException(
        'That coupon has been fully redeemed.',
      );
    }

    const subtotal = await this.subtotalOf(cart.id);
    const discount = this.computeDiscount(coupon, subtotal);
    await this.carts.update(cart.id, {
      couponId: coupon.id,
      subtotal,
      discountTotal: discount,
    });
    return this.getCartView(userId);
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** Load a cart line, 404 if unknown, 403 if it belongs to another user. */
  private async loadOwnedLine(
    userId: string,
    itemId: string,
    relations: { cart?: boolean; course?: boolean },
  ): Promise<CartItem> {
    const line = await this.items.findOne({ where: { id: itemId }, relations });
    if (!line) {
      throw new NotFoundException('Cart line not found!');
    }
    const cart =
      line.cart ?? (await this.carts.findById(line.cartId));
    if (!cart || cart.userId !== userId) {
      throw new ForbiddenException('This cart line belongs to another user!');
    }
    return line;
  }

  /** Sum the cart's line prices. */
  private async subtotalOf(cartId: string): Promise<number> {
    const lines = await this.items.findByCart(cartId);
    const sum = lines.reduce(
      (acc, l) => acc + Number(l.unitPrice) * l.quantity,
      0,
    );
    return this.round(sum);
  }

  /** Recompute subtotal and, if a coupon is applied, its discount. */
  private async recompute(cartId: string): Promise<void> {
    const cart = await this.carts.findById(cartId);
    if (!cart) return;
    const subtotal = await this.subtotalOf(cartId);
    let discount = 0;
    if (cart.couponId) {
      const coupon = await this.coupons.findById(cart.couponId);
      if (coupon) discount = this.computeDiscount(coupon, subtotal);
    }
    await this.carts.update(cartId, { subtotal, discountTotal: discount });
  }

  private computeDiscount(coupon: Coupon, subtotal: number): number {
    const raw =
      coupon.discountType === discount_type.PERCENT
        ? subtotal * (Number(coupon.discountValue) / 100)
        : Number(coupon.discountValue);
    return this.round(Math.min(raw, subtotal));
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toItemView(item: CartItem, course?: Course): CartItemView {
    return {
      id: item.id,
      courseId: item.courseId,
      course: course
        ? {
            title: course.title,
            slug: course.slug,
            category: categoryRef(course.category),
            thumbnailUrl: course.thumbnailUrl ?? null,
          }
        : null,
      unitPrice: Number(item.unitPrice),
      quantity: item.quantity ?? 1,
    };
  }

  private toCartView(
    cart: Cart,
    lines: CartItem[],
    coupon: Coupon | null,
  ): CartView {
    return {
      id: cart.id,
      items: lines.map((l) => this.toItemView(l, l.course)),
      coupon: coupon
        ? {
            code: coupon.code,
            discountType: coupon.discountType,
            discountValue: Number(coupon.discountValue),
          }
        : null,
      subtotal: Number(cart.subtotal),
      discountTotal: Number(cart.discountTotal),
    };
  }
}
