import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { course_level } from '../../../common/enums/course-level.enum';

/** Sort keys accepted by GET /api/courses. */
export const COURSE_SORTS = [
  'popular',
  'newest',
  'price_asc',
  'price_desc',
] as const;
export type CourseSort = (typeof COURSE_SORTS)[number];

/** GET /api/categories — public. `active` filters the is_active flag. */
export class CatalogueCategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Restrict to active (true) or inactive (false) categories',
  })
  @IsOptional()
  @Transform(({ value }) =>
    value === true || value === 'true' || value === '1'
      ? true
      : value === false || value === 'false' || value === '0'
        ? false
        : undefined,
  )
  active?: boolean;
}

/** GET /api/courses — public, PUBLISHED only, search / category / level / sort / page. */
export class CatalogueCourseQueryDto {
  @ApiPropertyOptional({ description: 'Free-text match on title or summary' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Category slug' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  category?: string;

  @ApiPropertyOptional({
    enum: course_level,
    description: '1 beginner / 2 intermediate / 3 advanced',
  })
  @IsOptional()
  @Type(() => Number)
  @IsEnum(course_level)
  level?: course_level;

  @ApiPropertyOptional({ enum: COURSE_SORTS, default: 'popular' })
  @IsOptional()
  @IsIn(COURSE_SORTS)
  sort?: CourseSort;

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;
}

/** GET /api/instructors — public, instructors (role 2) holding a published course. */
export class CatalogueInstructorQueryDto {
  @ApiPropertyOptional({ description: 'Free-text match on name or headline' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}
