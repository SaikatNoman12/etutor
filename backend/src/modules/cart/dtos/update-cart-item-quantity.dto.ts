import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for PATCH /api/cart/items/:id. Quantity is always 1 for a course, so the
 * value is accepted (and validated as a positive integer) but the service pins
 * the persisted quantity to 1 regardless.
 */
export class UpdateCartItemQuantityDto {
  @ApiProperty({ example: 1, description: 'Line quantity (always coerced to 1 for a course).' })
  @IsInt()
  @Min(1)
  quantity!: number;
}
