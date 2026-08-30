import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from '../order-item/order-item.entity';
import { Enrollment } from '../enrollment/enrollment.entity';
import { OrderRepository } from './order.repository';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { CartModule } from '../cart/cart.module';
import { OrderItemModule } from '../order-item/order-item.module';
import { EnrollmentModule } from '../enrollment/enrollment.module';

/**
 * Order module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 *
 * OrderItem + Enrollment entities are registered here too so OrderService can
 * inject their repositories (freeze order lines, create enrollments on pay)
 * without coupling to the sibling modules' providers.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Enrollment]),
    CartModule,
    // OrderService composes against these modules' own repositories.
    OrderItemModule,
    EnrollmentModule,
  ],
  controllers: [OrderController, AdminOrdersController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository, TypeOrmModule],
})
export class OrderModule {}
