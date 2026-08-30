import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Lesson } from './lesson.entity';
import { LessonRepository } from './lesson.repository';
import { LessonService } from './lesson.service';
import { LessonController } from './lesson.controller';
import { AdminLessonsController } from './admin-lessons.controller';

/**
 * Lesson module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Lesson])],
  controllers: [LessonController, AdminLessonsController],
  providers: [LessonService, LessonRepository],
  exports: [LessonService, LessonRepository, TypeOrmModule],
})
export class LessonModule {}
