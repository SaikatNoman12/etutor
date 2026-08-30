import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartItem } from './cart-item.entity';
import { CartItemRepository } from './cart-item.repository';
import { CartItemService } from './cart-item.service';
import { CartItemController } from './cart-item.controller';

/**
 * CartItem module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CartItem])],
  controllers: [CartItemController],
  providers: [CartItemService, CartItemRepository],
  exports: [CartItemService, CartItemRepository, TypeOrmModule],
})
export class CartItemModule {}
