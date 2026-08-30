import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import {
  EnrollmentListView,
  EnrollmentService,
  PlayerView,
} from './enrollment.service';

/**
 * Enrollments at /api/enrollments — the learning feature. Every route is scoped
 * to the authenticated session user (JwtAuthGuard + @CurrentUser); ADMIN bypasses
 * the own-row scope inside the service. Implements GET /enrollments (My learning
 * list), GET /enrollments/:id (course player) and
 * POST /enrollments/:id/lessons/:lessonId/complete (mark a lesson complete) from
 * PROJECT_API. Enrollments are created by paying an order, never by this
 * controller, so there is no create/update/delete route here.
 */
@ApiTags('enrollments')
@UseGuards(JwtAuthGuard)
@Controller('enrollments')
export class EnrollmentController {
  constructor(private readonly service: EnrollmentService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "List the current user's enrollments (My learning)" })
  @ApiResponse({
    status: 200,
    description: 'Enrollments, most recently touched first.',
  })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async findAll(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
  ): Promise<EnrollmentListView> {
    return this.service.listForUser(userId, role);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the course player payload for an enrollment' })
  @ApiResponse({
    status: 200,
    description: 'Course, sections with published lessons, and progress_percent.',
  })
  @ApiResponse({ status: 403, description: 'Cancelled or another user’s enrollment' })
  @ApiResponse({ status: 404, description: 'Unknown enrollment' })
  async findOne(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlayerView> {
    return this.service.getPlayerForUser(id, userId, role);
  }

  @Post(':id/lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lesson complete and recompute progress' })
  @ApiResponse({
    status: 200,
    description:
      'Progress upserted; enrollment flipped to ENROLL_COMPLETED at 100%.',
  })
  @ApiResponse({ status: 403, description: 'Cancelled or another user’s enrollment' })
  @ApiResponse({ status: 404, description: 'Unknown lesson' })
  async completeLesson(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('lessonId') lessonId: string,
  ): Promise<PlayerView> {
    return this.service.completeLesson(id, lessonId, userId, role);
  }
}
