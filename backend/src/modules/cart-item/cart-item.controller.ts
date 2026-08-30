import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { CartItem } from './cart-item.entity';
import { CartItemService } from './cart-item.service';
import { CreateCartItemDto } from './dtos/create-cart-item.dto';
import { UpdateCartItemDto } from './dtos/update-cart-item.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard)
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
