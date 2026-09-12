import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';
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
/**
 * ADMIN ONLY. This controller is BaseController's generated CRUD, and it carried
 * nothing but JwtAuthGuard — so any signed-in account could use it. Verified
 * against a running instance: a student could POST a 100%-off coupon, PATCH any
 * course's price, and read every cart, order line and lesson-progress row on the
 * platform.
 *
 * Nothing in either app calls these routes. The public catalogue is served by
 * CatalogueController (registered first, so it owns GET /api/courses and
 * GET /api/categories), the shopper's own cart by CartManagementController, and
 * the console by AdminConsoleController.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', user_role.ADMIN)
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
