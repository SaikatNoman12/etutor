import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { CourseSection } from './course-section.entity';
import { CourseSectionService } from './course-section.service';
import { CreateCourseSectionDto } from './dtos/create-course-section.dto';
import { UpdateCourseSectionDto } from './dtos/update-course-section.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';

/**
 * CourseSection controller — generated. Extends BaseController to expose
 * standard /courseSections CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('course-sections')):
 *   GET    /courseSections         findAll
 *   GET    /courseSections/:id     findOne
 *   POST   /courseSections         create     (body: CreateCourseSectionDto)
 *   PATCH  /courseSections/:id     update     (body: UpdateCourseSectionDto)
 *   DELETE /courseSections/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('courseSections')
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
@Controller('course-sections') /* scaffold-controller-route-doctor: courseSections → course-sections */
export class CourseSectionController extends BaseController<
  CourseSection,
  CreateCourseSectionDto,
  UpdateCourseSectionDto
> {
  constructor(protected readonly service: CourseSectionService) {
    super(service, CreateCourseSectionDto, UpdateCourseSectionDto);
  }
}
