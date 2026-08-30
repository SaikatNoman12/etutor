import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { OrderItem } from './order-item.entity';
import { OrderItemService } from './order-item.service';
import { CreateOrderItemDto } from './dtos/create-order-item.dto';
import { UpdateOrderItemDto } from './dtos/update-order-item.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

/**
 * OrderItem controller — generated. Extends BaseController to expose
 * standard /orderItems CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('order-items')):
 *   GET    /orderItems         findAll
 *   GET    /orderItems/:id     findOne
 *   POST   /orderItems         create     (body: CreateOrderItemDto)
 *   PATCH  /orderItems/:id     update     (body: UpdateOrderItemDto)
 *   DELETE /orderItems/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('orderItems')
@UseGuards(JwtAuthGuard)
@Controller('order-items') /* scaffold-controller-route-doctor: orderItems → order-items */
export class OrderItemController extends BaseController<
  OrderItem,
  CreateOrderItemDto,
  UpdateOrderItemDto
> {
  constructor(protected readonly service: OrderItemService) {
    super(service, CreateOrderItemDto, UpdateOrderItemDto);
  }
}
