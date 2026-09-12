import { IsString, Length, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/** Body for POST /api/cart/coupon — the coupon code to validate against the cart. */
export class ApplyCouponDto {
  @ApiProperty({ example: 'LEARN10', description: 'Coupon code; matched case-insensitively.' })
  @IsString()
  // Codes are STORED uppercase. Requiring the shopper to type them that way made
  // "learn10" a validation error on a code that exists — so normalise first and
  // let the rule police the shape, not the shift key.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Length(3, 32)
  @Matches(/^[A-Z0-9]+$/, { message: 'A coupon code is letters and digits only.' })
  code!: string;
}
