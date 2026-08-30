import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DashboardWhereDto {
  @ApiProperty()
  @IsString()
  field!: string;

  @ApiProperty({ enum: ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'] })
  @IsIn(['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'IN'])
  op!: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  value!: unknown;
}

export class DashboardGroupDto {
  @ApiProperty({ description: 'Field name to group by, or "day" for time bucket' })
  @IsString()
  field!: string;

  @ApiPropertyOptional({ description: 'Required when field=day; column to bucket on (default createdAt)' })
  @IsOptional()
  @IsString()
  timestampField?: string;

  @ApiPropertyOptional({ description: '{ days: N } — only applies when field=day' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  window?: { days: number };
}

export class DashboardQueryDto {
  @ApiProperty({ description: 'Entity tableName or class name' })
  @IsString()
  entity!: string;

  @ApiProperty({ enum: ['count'], description: 'Aggregation op' })
  @IsIn(['count'])
  op!: 'count';

  @ApiPropertyOptional({ type: [DashboardWhereDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DashboardWhereDto)
  where?: DashboardWhereDto[];

  @ApiPropertyOptional({ type: DashboardGroupDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DashboardGroupDto)
  group?: DashboardGroupDto;
}

export interface DashboardResultItem {
  key: string | number | null;
  count: number;
}

export interface DashboardResult {
  value?: number;
  items?: DashboardResultItem[];
}
