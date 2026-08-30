import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import {
  CartManagementService,
  CartItemView,
  CartView,
} from './cart-management.service';
import { AddCartItemDto } from './dtos/add-cart-item.dto';
import { UpdateCartItemQuantityDto } from './dtos/update-cart-item-quantity.dto';
import { ApplyCouponDto } from './dtos/apply-coupon.dto';

/**
 * Customer-facing cart at /api/cart. Every route is scoped to the authenticated
 * session user (JwtAuthGuard + @CurrentUser) — a student only ever touches their
 * own cart. Implements the cart feature endpoints from PROJECT_API.
 */
@ApiTags('cart')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartManagementController {
  constructor(private readonly service: CartManagementService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the current user's cart" })
  @ApiResponse({ status: 200, description: 'The cart with its lines and coupon.' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getCart(@CurrentUser('id') userId: string): Promise<CartView> {
    return this.service.getCartView(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a course to the cart' })
  @ApiResponse({ status: 201, description: 'The added line.' })
  @ApiResponse({ status: 404, description: 'Course not found or unpublished' })
  @ApiResponse({ status: 409, description: 'Course already owned or already in the cart' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddCartItemDto,
  ): Promise<CartItemView> {
    return this.service.addItem(userId, dto.courseId);
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a cart line quantity' })
  @ApiResponse({ status: 200, description: 'The updated line.' })
  @ApiResponse({ status: 403, description: "Another user's cart line" })
  @ApiResponse({ status: 404, description: 'Unknown line' })
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemQuantityDto,
  ): Promise<CartItemView> {
    return this.service.updateItemQuantity(userId, id, dto.quantity);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a cart line' })
  @ApiResponse({ status: 204, description: 'Line removed; totals recomputed.' })
  @ApiResponse({ status: 403, description: "Another user's cart line" })
  @ApiResponse({ status: 404, description: 'Unknown line' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.service.removeItem(userId, id);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Empty the cart' })
  @ApiResponse({ status: 204, description: 'Cart emptied and any coupon dropped.' })
  async clear(@CurrentUser('id') userId: string): Promise<void> {
    await this.service.clear(userId);
  }

  @Post('coupon')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Apply a coupon to the cart' })
  @ApiResponse({ status: 200, description: 'The cart with the discount applied.' })
  @ApiResponse({ status: 422, description: 'Invalid, expired, or over-used coupon' })
  async applyCoupon(
    @CurrentUser('id') userId: string,
    @Body() dto: ApplyCouponDto,
  ): Promise<CartView> {
    return this.service.applyCoupon(userId, dto.code);
  }
}
