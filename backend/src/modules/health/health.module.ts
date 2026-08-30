import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';

/**
 * health.module.ts — wires HealthController into AppModule.
 *
 * Add `HealthModule` to AppModule.imports. The controller injects the global
 * TypeORM DataSource (already exported by TypeOrmModule.forRoot), so no extra
 * providers are needed here.
 */
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
