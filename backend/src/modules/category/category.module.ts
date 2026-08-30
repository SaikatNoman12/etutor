import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';
import { CategoryController } from './category.controller';
import { AdminCategoriesController } from './admin-categories.controller';

/**
 * Category module — generated. Wires the standard
 * controller + service + repository triple and exports BOTH the service
 * and the repository so other modules can compose against either
 * abstraction. v92 evidence: workflow / scheduler / satellite modules
 * that wanted Repository (e.g. for cross-cutting queries) couldn't get
 * it when only Service was exported, causing Nest DI to fail at boot.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Category])],
  controllers: [CategoryController, AdminCategoriesController],
  providers: [CategoryService, CategoryRepository],
  exports: [CategoryService, CategoryRepository, TypeOrmModule],
})
export class CategoryModule {}
