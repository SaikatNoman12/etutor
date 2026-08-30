import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { order_status } from '../../../common/enums/order-status.enum';

/** GET /api/admin/orders — search, status/date filter, sort, page. */
export class AdminOrderQueryDto {
  @ApiPropertyOptional({ description: 'Matches order number, student name or email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: order_status, description: '0 pending / 1 paid / 2 cancelled / 3 refunded' })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(order_status)
  status?: order_status;

  @ApiPropertyOptional({ description: 'ISO date — placed at or after' })
  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date — placed at or before' })
  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sort?: string;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/** PATCH /api/admin/orders/:id — set the order status. */
export class UpdateOrderStatusDto {
  @ApiProperty({ enum: order_status, description: '0 pending / 1 paid / 2 cancelled / 3 refunded' })
  @Type(() => Number)
  @IsEnum(order_status)
  status!: order_status;
}
