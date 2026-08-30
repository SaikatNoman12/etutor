import { IsNumber, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Body for the generic POST /api/carts create route. `userId` is NOT accepted
 * here — a cart always belongs to the authenticated session user, resolved by
 * the controller via @CurrentUser. subtotal + discountTotal are required so an
 * empty body fails validation (400) while the real totals are otherwise
 * recomputed from the cart's lines by CartManagementService.
 */
export class CreateCartDto {
  @ApiProperty()
  @IsNumber()
  subtotal!: number;

  @ApiProperty()
  @IsNumber()
  discountTotal!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  couponId?: string;
}

export type CreateCartRequest = CreateCartDto;
