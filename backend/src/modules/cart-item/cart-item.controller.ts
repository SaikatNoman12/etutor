import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { CartItem } from './cart-item.entity';
import { CartItemService } from './cart-item.service';
import { CreateCartItemDto } from './dtos/create-cart-item.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';

/**
 * CartItem controller — generated. Extends BaseController to expose
 * standard /cartItems CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('cart-items')):
 *   GET    /cartItems         findAll
 *   GET    /cartItems/:id     findOne
 *   POST   /cartItems         create     (body: CreateCartItemDto)
 *   PATCH  /cartItems/:id     update     (body: UpdateCartItemDto)
 *   DELETE /cartItems/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('cartItems')
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
@Controller('cart-items') /* scaffold-controller-route-doctor: cartItems → cart-items */
export class CartItemController extends BaseController<
  CartItem,
  CreateCartItemDto,
  UpdateCartItemDto
> {
  constructor(protected readonly service: CartItemService) {
    super(service, CreateCartItemDto, UpdateCartItemDto);
  }
}
