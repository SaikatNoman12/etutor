import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { Category } from './category.entity';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dtos/create-category.dto';
import { UpdateCategoryDto } from './dtos/update-category.dto';

/**
 * Category controller — generated. Extends BaseController to expose
 * standard /categories CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('categories')):
 *   GET    /categories         findAll
 *   GET    /categories/:id     findOne
 *   POST   /categories         create     (body: CreateCategoryDto)
 *   PATCH  /categories/:id     update     (body: UpdateCategoryDto)
 *   DELETE /categories/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('categories')
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoryController extends BaseController<
  Category,
  CreateCategoryDto,
  UpdateCategoryDto
> {
  constructor(protected readonly service: CategoryService) {
    super(service, CreateCategoryDto, UpdateCategoryDto);
  }
}
