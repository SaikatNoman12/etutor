import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { user_role } from '../../../common/enums/user-role.enum';
import { user_status } from '../../../common/enums/user-status.enum';

/** GET /api/admin/users — search, role/status filter, sort, page. */
export class AdminUserQueryDto {
  @ApiPropertyOptional({ description: 'Matches full name or email' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: user_role, description: '1 student / 2 instructor / 99 admin' })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(user_role)
  role?: user_role;

  @ApiPropertyOptional({ enum: user_status, description: '0 pending / 1 active / 2 suspended' })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(user_status)
  status?: user_status;

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

/** POST /api/admin/users. */
export class CreateAdminUserDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ enum: user_role, description: '1 student / 2 instructor / 99 admin' })
  @Type(() => Number)
  @IsEnum(user_role)
  role!: user_role;

  @ApiProperty({ enum: user_status, description: '0 pending / 1 active / 2 suspended' })
  @Type(() => Number)
  @IsEnum(user_status)
  status!: user_status;
}

/** PATCH /api/admin/users/:id — every field optional. */
export class UpdateAdminUserDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional({ enum: user_role })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(user_role)
  role?: user_role;

  @ApiPropertyOptional({ enum: user_status })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(user_status)
  status?: user_status;
}
