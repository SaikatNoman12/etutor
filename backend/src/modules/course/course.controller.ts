import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
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
@UseGuards(JwtAuthGuard)
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
