import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindManyOptions,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import { BaseService } from '../../core/base/base.service';
import { Order } from './order.entity';
import { OrderRepository } from './order.repository';
import { OrderItem } from '../order-item/order-item.entity';
import { OrderItemRepository } from '../order-item/order-item.repository';
import { Enrollment } from '../enrollment/enrollment.entity';
import { EnrollmentRepository } from '../enrollment/enrollment.repository';
import { CreateOrderDto } from './dtos/create-order.dto';
import { order_status } from '../../common/enums/order-status.enum';
import { enrollment_status } from '../../common/enums/enrollment-status.enum';
import { RoleEnum, ROLE_VALUES } from '../../common/enums/role.enum';
import { CartManagementService } from '../cart/cart-management.service';

/** One row of GET /api/orders. */
export interface OrderListItem {
  id: string;
  orderNumber: string;
  placedAt: Date;
  itemCount: number;
  total: number;
  status: order_status;
}

/** GET /api/orders — the session user's orders, newest first, paginated. */
export interface OrderListView {
  items: OrderListItem[];
  meta: { page: number; page_size: number; total: number };
}

/** GET /api/orders/:id — the order with its frozen line items and totals. */
export interface OrderDetailView {
  id: string;
  orderNumber: string;
  status: order_status;
  placedAt: Date;
  paidAt: Date | null;
  paymentMethod: string | null;
  couponId: string | null;
  /**
   * The code, not just the id. The admin's projection of the same order returns
   * `coupon: { code }` and this one returned `couponId`, so the two screens
   * showing one order disagreed about what to call the coupon — and the page
   * reading a code from this payload found none and hid the row.
   */
  coupon: { code: string } | null;
  items: { titleSnapshot: string; unitPrice: number }[];
  subtotal: number;
  discountTotal: number;
  total: number;
}

const PAGE_SIZE = 20;

/**
 * OrderService — the checkout_order feature. Placing an order freezes its
 * course prices into order_items and leaves it ORDER_PENDING; paying settles it
 * to ORDER_PAID and creates one enrollment per item. Every read is scoped to the
 * session user (ADMIN bypasses the scope). The order_items / enrollment
 * repositories are injected via TypeOrmModule.forFeature so the module stays
 * decoupled from its siblings' providers (same convention as the cart).
 */
@Injectable()
export class OrderService extends BaseService<Order> {
  constructor(
    protected readonly repository: OrderRepository,
    // Sibling modules' own repositories — the query lives with the data it belongs to.
    private readonly orderItems: OrderItemRepository,
    private readonly enrollments: EnrollmentRepository,
    private readonly cart: CartManagementService,
  ) {
    super(repository, 'Order');
  }

  private isAdmin(role: unknown): boolean {
    return role === RoleEnum.admin || Number(role) === ROLE_VALUES.admin;
  }

  private assertOwner(order: Order, userId: string, role: unknown): void {
    if (!this.isAdmin(role) && order.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to access this order!',
      );
    }
  }

  private toDetailView(order: Order, lines: OrderItem[]): OrderDetailView {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      placedAt: order.placedAt,
      paidAt: order.paidAt ?? null,
      paymentMethod: order.paymentMethod ?? null,
      couponId: order.couponId ?? null,
      coupon: order.coupon ? { code: order.coupon.code } : null,
      items: lines.map((l) => ({
        titleSnapshot: l.titleSnapshot,
        unitPrice: l.unitPrice,
      })),
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      total: order.total,
    };
  }

  /** Create an order for the session user; userId never comes from the body. */
  async createForUser(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderDetailView> {
    // Checkout builds the order FROM THE CART: it copied the request body instead, so every
    // order was placed with no items and a zero total, and payOrder — which enrols one course
    // per order item — therefore enrolled nobody. The cart is the only thing that knows what
    // is being bought, and the price has to be frozen here (PRD S5: editing a course price
    // must not rewrite what someone already paid).
    const cart = await this.cart.getCartView(userId);
    if (!cart.items.length) {
      throw new BadRequestException('Your cart is empty');
    }

    const subtotal = cart.items.reduce((sum, line) => sum + Number(line.unitPrice), 0);
    const discountTotal = Number(cart.discountTotal) || 0;
    const total = Math.max(0, subtotal - discountTotal);

    const order = await this.repository.create({
      billingName: dto.billingName,
      billingEmail: dto.billingEmail,
      billingCountry: dto.billingCountry,
      paymentMethod: dto.paymentMethod,
      userId,
      orderNumber: await this.nextOrderNumber(),
      subtotal,
      discountTotal,
      total,
      status: order_status.PENDING,
      placedAt: new Date(),
    });

    const lines: OrderItem[] = [];
    for (const line of cart.items) {
      lines.push(
        await this.orderItems.create({
          orderId: order.id,
          courseId: line.courseId,
          titleSnapshot: line.course?.title ?? 'Course',
          unitPrice: Number(line.unitPrice),
          quantity: 1,
        }),
      );
    }

    // The cart is consumed by the order it became.
    await this.cart.clear(userId);

    return this.toDetailView(order, lines);
  }

  /**
   * ET-#### — the human-facing identifier PROJECT_DATABASE marks `display_id`. Minted here
   * because it is server-owned: the client cannot know it, and it must be unique.
   */
  private async nextOrderNumber(): Promise<string> {
    const count = await this.repository.count();
    for (let n = count + 1001; ; n++) {
      const candidate = 'ET-' + n;
      const clash = await this.repository.findOne({ where: { orderNumber: candidate } });
      if (!clash) return candidate;
    }
  }

  /** The session user's orders (ADMIN sees all), newest first, 20 per page. */
  async listForUser(
    userId: string,
    role: unknown,
    page = 1,
  ): Promise<OrderListView> {
    const currentPage = Math.max(1, Math.floor(page) || 1);
    const where: FindOptionsWhere<Order> = this.isAdmin(role) ? {} : { userId };
    const options: FindManyOptions<Order> = {
      where,
      order: { placedAt: 'DESC' },
      take: PAGE_SIZE,
      skip: (currentPage - 1) * PAGE_SIZE,
    };

    const [orders, total] = await Promise.all([
      this.repository.findAll(options),
      this.repository.count({ where }),
    ]);

    const items = await Promise.all(
      orders.map(async (o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        placedAt: o.placedAt,
        itemCount: await this.orderItems.countByOrder(o.id),
        total: o.total,
        status: o.status,
      })),
    );

    return {
      items,
      meta: { page: currentPage, page_size: PAGE_SIZE, total },
    };
  }

  /** One order with its frozen items; 404 if unknown, 403 for another user's. */
  async getDetailForUser(
    id: string,
    userId: string,
    role: unknown,
  ): Promise<OrderDetailView> {
    const order = await this.findByIdOrFail(id, { coupon: true });
    this.assertOwner(order, userId, role);
    const lines = await this.orderItems.findByOrder(id);
    return this.toDetailView(order, lines);
  }

  /**
   * Settle an order to ORDER_PAID and create one enrollment per item.
   * Idempotent: paying an already-paid order returns it unchanged, and an
   * enrollment that already exists (unique per user+course) is left in place.
   */
  async payOrder(
    id: string,
    userId: string,
    role: unknown,
  ): Promise<OrderDetailView> {
    const order = await this.findByIdOrFail(id);
    this.assertOwner(order, userId, role);

    if (order.status !== order_status.PAID) {
      const lines = await this.orderItems.findByOrder(id);
      for (const line of lines) {
        const existing = await this.enrollments.findForUserAndCourse(
          order.userId,
          line.courseId,
        );
        if (!existing) {
          await this.enrollments.create({
            userId: order.userId,
            courseId: line.courseId,
            orderId: order.id,
            status: enrollment_status.ACTIVE,
            progressPercent: 0,
            enrolledAt: new Date(),
          });
        }
      }
      await this.repository.update(id, {
        status: order_status.PAID,
        paidAt: new Date(),
      });
    }

    return this.getDetailForUser(id, userId, role);
  }
}
