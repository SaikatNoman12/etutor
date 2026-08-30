import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { CourseSection } from './course-section.entity';
import { CourseSectionService } from './course-section.service';
import { CreateCourseSectionDto } from './dtos/create-course-section.dto';
import { UpdateCourseSectionDto } from './dtos/update-course-section.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard)
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
