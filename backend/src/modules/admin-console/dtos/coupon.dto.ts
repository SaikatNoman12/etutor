import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { discount_type } from '../../../common/enums/discount-type.enum';

/** GET /api/admin/coupons — search, sort, page. */
export class AdminCouponQueryDto {
  @ApiPropertyOptional({ description: 'Matches coupon code' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  search?: string;

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

/** POST /api/admin/coupons. */
export class CreateAdminCouponDto {
  @ApiProperty()
  @IsString()
  @MaxLength(32)
  code!: string;

  @ApiProperty({ enum: discount_type, description: '1 percent / 2 fixed' })
  @Type(() => Number)
  @IsEnum(discount_type)
  discountType!: discount_type;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/** PATCH /api/admin/coupons/:id — every field optional. */
export class UpdateAdminCouponDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  code?: string;

  @ApiPropertyOptional({ enum: discount_type })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(discount_type)
  discountType?: discount_type;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxUses?: number;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'ISO date' })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
