import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from './course.entity';
import { CourseSection } from '../course-section/course-section.entity';
import { Lesson } from '../lesson/lesson.entity';
import { CourseRepository } from './course.repository';
import { CourseService } from './course.service';
import { CourseController } from './course.controller';
import { AdminCoursesController } from './admin-courses.controller';
import { CourseSectionModule } from '../course-section/course-section.module';
import { LessonModule } from '../lesson/lesson.module';

/**
 * Course module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Course, CourseSection, Lesson]),
    // CourseService composes against the sibling modules' repositories, so those modules
    // must be imported — TypeOrmModule.forFeature alone provides Repository<T>, not the
    // custom CourseSectionRepository / LessonRepository classes.
    CourseSectionModule,
    LessonModule,
  ],
  controllers: [CourseController, AdminCoursesController],
  providers: [CourseService, CourseRepository],
  exports: [CourseService, CourseRepository, TypeOrmModule],
})
export class CourseModule {}
