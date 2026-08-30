import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Body for POST /api/cart/items — the course to add to the session user's cart. */
export class AddCartItemDto {
  @ApiProperty({ description: 'Id of the published course to add.' })
  @IsUUID()
  courseId!: string;
}
