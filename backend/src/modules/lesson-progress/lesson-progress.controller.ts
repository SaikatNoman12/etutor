import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { LessonProgress } from './lesson-progress.entity';
import { LessonProgressService } from './lesson-progress.service';
import { CreateLessonProgressDto } from './dtos/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dtos/update-lesson-progress.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/guards/roles.guard';
import { Roles } from '../../core/decorators/roles.decorator';
import { user_role } from '../../common/enums/user-role.enum';

/**
 * LessonProgress controller — generated. Extends BaseController to expose
 * standard /lessonProgress CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('lesson-progress')):
 *   GET    /lessonProgress         findAll
 *   GET    /lessonProgress/:id     findOne
 *   POST   /lessonProgress         create     (body: CreateLessonProgressDto)
 *   PATCH  /lessonProgress/:id     update     (body: UpdateLessonProgressDto)
 *   DELETE /lessonProgress/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('lessonProgress')
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
@Controller('lesson-progress') /* scaffold-controller-route-doctor: lessonProgress → lesson-progress */
export class LessonProgressController extends BaseController<
  LessonProgress,
  CreateLessonProgressDto,
  UpdateLessonProgressDto
> {
  constructor(protected readonly service: LessonProgressService) {
    super(service, CreateLessonProgressDto, UpdateLessonProgressDto);
  }
}
