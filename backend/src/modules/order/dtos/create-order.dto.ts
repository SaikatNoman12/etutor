// Body accepted by POST /api/orders. userId is intentionally ABSENT — it is taken
// from the authenticated session (@CurrentUser), never trusted from the request.
// `order_status` is imported so the type resolves (the scaffold left it dangling).
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { order_status } from '../../../common/enums/order-status.enum';

export class CreateOrderDto {
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(20)
  @IsOptional()
  orderNumber?: string;

  @ApiPropertyOptional({ enum: order_status })
  @IsOptional()
  @IsEnum(order_status)
  status?: order_status;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  couponId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountTotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  total?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(30)
  paymentMethod?: string;

  @ApiProperty()
  @IsString()
  // Without this, `billingName: ""` passed validation and an order was placed
  // with a blank name on it — @MaxLength alone only says how long it may be,
  // never that it has to be anything.
  @IsNotEmpty()
  @MaxLength(120)
  billingName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(160)
  billingEmail!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  billingCountry?: string;

  @ApiPropertyOptional({ description: 'Server-set; ignored if supplied' })
  @IsOptional()
  @IsDateString()
  placedAt?: string;
}

export type CreateOrderRequest = CreateOrderDto;
