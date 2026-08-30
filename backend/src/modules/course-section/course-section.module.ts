import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseSection } from './course-section.entity';
import { CourseSectionRepository } from './course-section.repository';
import { CourseSectionService } from './course-section.service';
import { CourseSectionController } from './course-section.controller';

/**
 * CourseSection module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([CourseSection])],
  controllers: [CourseSectionController],
  providers: [CourseSectionService, CourseSectionRepository],
  exports: [CourseSectionService, CourseSectionRepository, TypeOrmModule],
})
export class CourseSectionModule {}
