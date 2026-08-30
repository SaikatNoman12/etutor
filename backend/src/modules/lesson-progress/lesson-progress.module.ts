import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonProgress } from './lesson-progress.entity';
import { LessonProgressRepository } from './lesson-progress.repository';
import { LessonProgressService } from './lesson-progress.service';
import { LessonProgressController } from './lesson-progress.controller';

/**
 * LessonProgress module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([LessonProgress])],
  controllers: [LessonProgressController],
  providers: [LessonProgressService, LessonProgressRepository],
  exports: [LessonProgressService, LessonProgressRepository, TypeOrmModule],
})
export class LessonProgressModule {}
