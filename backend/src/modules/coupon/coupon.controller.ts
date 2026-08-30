import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { Coupon } from './coupon.entity';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dtos/create-coupon.dto';
import { UpdateCouponDto } from './dtos/update-coupon.dto';

/**
 * Generic coupon CRUD surface at /api/coupons. Authenticated (JwtAuthGuard) —
 * every route re-checks the session, so an anonymous request answers 401.
 * `findAll` returns the paginated { items, meta } envelope; `remove` answers 204;
 * create / findOne / update are inherited from BaseController. The concrete DTO
 * classes are handed to super() so the inherited create/update validate the body
 * (400 on a malformed payload) — the generic @Body() type erases at runtime and
 * would otherwise skip validation. Admin coupon management (409 on a duplicate
 * code, deactivate-if-used on delete) lives on /api/admin/coupons — see
 * AdminConsoleController.
 */
@ApiTags('coupons')
@UseGuards(JwtAuthGuard)
@Controller('coupons')
export class CouponController extends BaseController<
  Coupon,
  CreateCouponDto,
  UpdateCouponDto
> {
  constructor(protected readonly service: CouponService) {
    super(service, CreateCouponDto, UpdateCouponDto);
  }


}
