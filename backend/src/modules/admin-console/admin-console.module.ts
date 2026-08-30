import { Module } from '@nestjs/common';

import { AdminConsoleController } from './admin-console.controller';
import { AdminConsoleService } from './admin-console.service';

/**
 * AdminConsoleModule — wires the /api/admin console. Like DashboardModule it
 * carries no TypeOrmModule.forFeature of its own: the service reaches every
 * entity through the injected DataSource (each entity is already registered by
 * its owning feature module's forFeature, re-used here read-only). Auth is
 * satisfied globally — JwtStrategy is registered by AuthModule and RolesGuard
 * only needs the Reflector.
 */
@Module({
  controllers: [AdminConsoleController],
  providers: [AdminConsoleService],
  exports: [AdminConsoleService],
})
export class AdminConsoleModule {}
