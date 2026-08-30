import { Controller, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { BaseController } from '../../core/base/base.controller';
import { Lesson } from './lesson.entity';
import { LessonService } from './lesson.service';
import { CreateLessonDto } from './dtos/create-lesson.dto';
import { UpdateLessonDto } from './dtos/update-lesson.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';

/**
 * Lesson controller — generated. Extends BaseController to expose
 * standard /lessons CRUD endpoints with Swagger decorators and
 * ParseUUIDPipe on :id params. Override individual methods only when
 * you need custom auth scoping, response shaping, or pagination
 * defaults; otherwise leave the inherited behavior alone.
 *
 * Generated routes (under @Controller('lessons')):
 *   GET    /lessons         findAll
 *   GET    /lessons/:id     findOne
 *   POST   /lessons         create     (body: CreateLessonDto)
 *   PATCH  /lessons/:id     update     (body: UpdateLessonDto)
 *   DELETE /lessons/:id     remove     (soft delete via BaseEntity.deletedAt)
 */
@ApiTags('lessons')
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonController extends BaseController<
  Lesson,
  CreateLessonDto,
  UpdateLessonDto
> {
  constructor(protected readonly service: LessonService) {
    super(service, CreateLessonDto, UpdateLessonDto);
  }
}
