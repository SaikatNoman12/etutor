import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from './order-item.entity';
import { OrderItemRepository } from './order-item.repository';
import { OrderItemService } from './order-item.service';
import { OrderItemController } from './order-item.controller';

/**
 * OrderItem module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OrderItem])],
  controllers: [OrderItemController],
  providers: [OrderItemService, OrderItemRepository],
  exports: [OrderItemService, OrderItemRepository, TypeOrmModule],
})
export class OrderItemModule {}
