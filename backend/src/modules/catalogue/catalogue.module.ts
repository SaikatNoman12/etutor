import { Module } from '@nestjs/common';

import { CatalogueController } from './catalogue.controller';
import { CatalogueService } from './catalogue.service';

/**
 * CatalogueModule — the public storefront (categories, courses, instructors).
 * Like DashboardModule / AdminConsoleModule it carries no
 * TypeOrmModule.forFeature of its own: CatalogueService spans several entities
 * (category, course, course_section, lesson, user) and reaches each through the
 * injected DataSource — every one of them is already registered by its owning
 * feature module's forFeature and re-used here read-only. All routes are
 * @Public(), so no auth providers are needed.
 */
@Module({
  controllers: [CatalogueController],
  providers: [CatalogueService],
  exports: [CatalogueService],
})
export class CatalogueModule {}
