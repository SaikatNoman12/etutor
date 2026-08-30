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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';

import { AdminConsoleService } from './admin-console.service';
import {
  AdminCategoryQueryDto,
  AdminCouponQueryDto,
  AdminCourseQueryDto,
  AdminEnrollmentQueryDto,
  AdminOrderQueryDto,
  AdminUserQueryDto,
  CreateAdminCategoryDto,
  CreateAdminCouponDto,
  CreateAdminCourseDto,
  CreateAdminLessonDto,
  CreateAdminUserDto,
  UpdateAdminCategoryDto,
  UpdateAdminCouponDto,
  UpdateAdminCourseDto,
  UpdateAdminUserDto,
  UpdateOrderStatusDto,
} from './dtos';

/**
 * AdminConsoleController — the admin management console, mounted under
 * /api/admin. Every route requires an authenticated session (JwtAuthGuard)
 * that carries the ADMIN role (RolesGuard + @Roles). Both the string label
 * and the numeric code are passed to @Roles so the guard matches whichever
 * form the JWT carries (auth issues the numeric user_role value).
 */
@ApiTags('admin-console')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', user_role.ADMIN)
export class AdminConsoleController {
  constructor(private readonly service: AdminConsoleService) {}

  // ── dashboard ──
  @Get('stats')
  @ApiOperation({ summary: 'Console KPIs and recent-activity panels' })
  getStats() {
    return this.service.getStats();
  }

  // ── courses & lessons ──
  @Get('courses')
  @ApiOperation({ summary: 'List every course (all statuses)' })
  listCourses(@Query() query: AdminCourseQueryDto) {
    return this.service.listCourses(query);
  }

  @Get('courses/:id')
  @ApiOperation({ summary: 'One course with its sections and lessons' })
  getCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getCourse(id);
  }

  @Post('courses')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a course' })
  createCourse(@Body() dto: CreateAdminCourseDto) {
    return this.service.createCourse(dto);
  }

  @Patch('courses/:id')
  @ApiOperation({ summary: 'Update a course (incl. publish / archive)' })
  updateCourse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCourseDto,
  ) {
    return this.service.updateCourse(id, dto);
  }

  @Delete('courses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a course (archives if enrollments exist)' })
  deleteCourse(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCourse(id);
  }

  @Post('courses/:id/lessons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a lesson under a course' })
  addLesson(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdminLessonDto,
  ) {
    return this.service.addLesson(id, dto);
  }

  @Delete('lessons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a lesson and recompute progress' })
  deleteLesson(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteLesson(id);
  }

  // ── categories ──
  @Get('categories')
  @ApiOperation({ summary: 'List categories with course counts' })
  listCategories(@Query() query: AdminCategoryQueryDto) {
    return this.service.listCategories(query);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a category' })
  createCategory(@Body() dto: CreateAdminCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  updateCategory(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an empty category' })
  deleteCategory(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCategory(id);
  }

  // ── users ──
  @Get('users')
  @ApiOperation({ summary: 'List users' })
  listUsers(@Query() query: AdminUserQueryDto) {
    return this.service.listUsers(query);
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a user' })
  createUser(@Body() dto: CreateAdminUserDto) {
    return this.service.createUser(dto);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update a user (role / status)' })
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminUserDto,
  ) {
    return this.service.updateUser(id, dto);
  }

  // ── orders ──
  @Get('orders')
  @ApiOperation({ summary: 'List orders' })
  listOrders(@Query() query: AdminOrderQueryDto) {
    return this.service.listOrders(query);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'One order with items, buyer and coupon' })
  getOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getOrder(id);
  }

  @Patch('orders/:id')
  @ApiOperation({ summary: 'Change order status (paid creates enrollments)' })
  updateOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.service.updateOrder(id, dto);
  }

  @Post('orders/:id/refund')
  @ApiOperation({ summary: 'Refund an order and cancel its enrollments' })
  refundOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.refundOrder(id);
  }

  // ── enrollments ──
  @Get('enrollments')
  @ApiOperation({ summary: 'Read-only enrollment ledger' })
  listEnrollments(@Query() query: AdminEnrollmentQueryDto) {
    return this.service.listEnrollments(query);
  }

  // ── coupons ──
  @Get('coupons')
  @ApiOperation({ summary: 'List coupons' })
  listCoupons(@Query() query: AdminCouponQueryDto) {
    return this.service.listCoupons(query);
  }

  @Post('coupons')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a coupon' })
  createCoupon(@Body() dto: CreateAdminCouponDto) {
    return this.service.createCoupon(dto);
  }

  @Patch('coupons/:id')
  @ApiOperation({ summary: 'Update a coupon' })
  updateCoupon(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdminCouponDto,
  ) {
    return this.service.updateCoupon(id, dto);
  }

  @Delete('coupons/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an unused coupon (deactivates if used)' })
  deleteCoupon(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteCoupon(id);
  }
}
