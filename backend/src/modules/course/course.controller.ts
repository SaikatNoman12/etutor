import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';
import { Course } from './course.entity';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dtos/create-course.dto';
import { UpdateCourseDto } from './dtos/update-course.dto';

/**
 * Course controller — generated. Extends BaseController to expose
 * standard /courses CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('courses')):
 *   GET    /courses         findAll
 *   GET    /courses/:id     findOne
 *   POST   /courses         create     (body: CreateCourseDto)
 *   PATCH  /courses/:id     update     (body: UpdateCourseDto)
 *   DELETE /courses/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('courses')
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
@Controller('courses')
export class CourseController extends BaseController<
  Course,
  CreateCourseDto,
  UpdateCourseDto
> {
  constructor(protected readonly service: CourseService) {
    super(service, CreateCourseDto, UpdateCourseDto);
  }
}
