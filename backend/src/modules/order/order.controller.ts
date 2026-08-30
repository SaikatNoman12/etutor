import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import {
  OrderDetailView,
  OrderListView,
  OrderService,
} from './order.service';
import { CreateOrderDto } from './dtos/create-order.dto';

/**
 * Orders at /api/orders — the checkout_order feature. Every route is scoped to
 * the authenticated session user (JwtAuthGuard + @CurrentUser); ADMIN bypasses
 * the own-row scope inside the service. Implements POST /orders (place),
 * POST /orders/:id/pay (settle + enroll), GET /orders (list) and
 * GET /orders/:id (detail) from PROJECT_API.
 */
@ApiTags('orders')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Place an order for the current user' })
  @ApiResponse({ status: 201, description: 'The created order (ORDER_PENDING).' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderDetailView> {
    return this.service.createForUser(userId, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the current user's orders" })
  @ApiResponse({ status: 200, description: 'Paginated orders, newest first.' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Query('page') page?: string,
  ): Promise<OrderListView> {
    return this.service.listForUser(userId, role, page ? Number(page) : 1);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one order (own order only)' })
  @ApiResponse({ status: 200, description: 'The order with its frozen items.' })
  @ApiResponse({ status: 403, description: "Another user's order" })
  @ApiResponse({ status: 404, description: 'Unknown order' })
  async findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailView> {
    return this.service.getDetailForUser(id, userId, role);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Pay an order — settles it and creates enrollments' })
  @ApiResponse({ status: 200, description: 'The settled order (ORDER_PAID).' })
  @ApiResponse({ status: 403, description: "Another user's order" })
  @ApiResponse({ status: 404, description: 'Unknown order' })
  async pay(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrderDetailView> {
    return this.service.payOrder(id, userId, role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an order' })
  @ApiResponse({ status: 204, description: 'Order removed.' })
  @ApiResponse({ status: 404, description: 'Unknown order' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }
}
