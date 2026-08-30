import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body for POST /api/cart/coupon — the coupon code to validate against the cart. */
export class ApplyCouponDto {
  @ApiProperty({ example: 'WELCOME10', description: 'Uppercase alphanumeric coupon code.' })
  @IsString()
  @Length(3, 32)
  @Matches(/^[A-Z0-9]+$/, { message: 'Coupon code must be uppercase letters and digits only!' })
  code!: string;
}
