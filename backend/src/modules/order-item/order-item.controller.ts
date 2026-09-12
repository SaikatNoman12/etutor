import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { OrderItem } from './order-item.entity';
import { OrderItemService } from './order-item.service';
import { CreateOrderItemDto } from './dtos/create-order-item.dto';
import { UpdateOrderItemDto } from './dtos/update-order-item.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';

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
/**
 * ADMIN ONLY. This controller is BaseController's generated CRUD, and it carried
 * nothing but JwtAuthGuard — so any signed-in account could use it. Verified
 * against a running instance: a student could POST a 100%-off coupon, PATCH any
 * course's price, and read every cart, order line and lesson-progress row on the
 * platform.
 *
 * Nothing in either app calls these routes. The public catalogue is served by
 * CatalogueController (registered first, so it owns GET /api/courses and
 * GET /api/categories), the shopper's own cart by CartManagementController, and
 * the console by AdminConsoleController.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', user_role.ADMIN)
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
