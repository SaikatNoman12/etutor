import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { LessonProgress } from './lesson-progress.entity';
import { LessonProgressService } from './lesson-progress.service';
import { CreateLessonProgressDto } from './dtos/create-lesson-progress.dto';
import { UpdateLessonProgressDto } from './dtos/update-lesson-progress.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard)
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
