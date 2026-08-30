import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from './enrollment.entity';
import { Course } from '../course/course.entity';
import { CourseSection } from '../course-section/course-section.entity';
import { Lesson } from '../lesson/lesson.entity';
import { LessonProgress } from '../lesson-progress/lesson-progress.entity';
import { EnrollmentRepository } from './enrollment.repository';
import { EnrollmentService } from './enrollment.service';
import { EnrollmentController } from './enrollment.controller';
import { AdminEnrollmentsController } from './admin-enrollments.controller';
import { CourseModule } from '../course/course.module';
import { CourseSectionModule } from '../course-section/course-section.module';
import { LessonModule } from '../lesson/lesson.module';
import { LessonProgressModule } from '../lesson-progress/lesson-progress.module';

/**
 * Enrollment module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 *
 * Course / CourseSection / Lesson / LessonProgress entities are registered here
 * too so EnrollmentService can inject their repositories (build the player
 * payload and upsert progress) without coupling to the sibling modules'
 * providers — same convention as the order module.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enrollment,
      Course,
      CourseSection,
      Lesson,
      LessonProgress,
    ]),
    // EnrollmentService composes against these modules' own repositories — forFeature
    // provides Repository<T>, not the custom *Repository classes.
    CourseModule,
    CourseSectionModule,
    LessonModule,
    LessonProgressModule,
  ],
  controllers: [EnrollmentController, AdminEnrollmentsController],
  providers: [EnrollmentService, EnrollmentRepository],
  exports: [EnrollmentService, EnrollmentRepository, TypeOrmModule],
})
export class EnrollmentModule {}
