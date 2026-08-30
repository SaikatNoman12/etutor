import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../core/decorators/public.decorator';

import { CatalogueService } from './catalogue.service';
import {
  CatalogueCategoryQueryDto,
  CatalogueCourseQueryDto,
  CatalogueInstructorQueryDto,
} from './dtos';

/**
 * CatalogueController — the public, read-only storefront surface. Every route
 * is @Public() (no session required) and reads only PUBLISHED data. It owns the
 * feature-level catalogue endpoints declared in PROJECT_API:
 *
 *   GET /api/categories        — active categories + published-course counts
 *   GET /api/courses           — paginated published courses (search/category/level/sort)
 *   GET /api/courses/:slug      — one published course with sections/lessons/instructor
 *   GET /api/instructors        — instructors (role 2) holding a published course
 *   GET /api/instructors/:id    — one instructor profile + their published courses
 *
 * Mounted at the root (@Controller()) with fully-qualified paths so a single
 * controller can serve all three resource roots; the global `api` prefix is
 * applied by main.ts / the test factory.
 */
@ApiTags('catalogue')
@Controller()
export class CatalogueController {
  constructor(private readonly catalogueService: CatalogueService) {}

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'List active categories with published-course counts' })
  listCategories(@Query() query: CatalogueCategoryQueryDto) {
    return this.catalogueService.listCategories(query);
  }

  @Get('courses')
  @Public()
  @ApiOperation({ summary: 'List published courses (search / category / level / sort)' })
  listCourses(@Query() query: CatalogueCourseQueryDto) {
    return this.catalogueService.listCourses(query);
  }

  @Get('courses/:slug')
  @Public()
  @ApiOperation({ summary: 'Get one published course by slug' })
  getCourseBySlug(@Param('slug') slug: string) {
    return this.catalogueService.getCourseBySlug(slug);
  }

  @Get('instructors')
  @Public()
  @ApiOperation({ summary: 'List instructors holding a published course' })
  listInstructors(@Query() query: CatalogueInstructorQueryDto) {
    return this.catalogueService.listInstructors(query);
  }

  @Get('instructors/:id')
  @Public()
  @ApiOperation({ summary: 'Get one instructor profile and their published courses' })
  getInstructor(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogueService.getInstructor(id);
  }
}
