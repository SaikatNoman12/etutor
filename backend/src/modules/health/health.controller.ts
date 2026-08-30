/**
 * health.controller.ts — liveness + readiness endpoints.
 *
 * GET /api/health           → 200 { status: 'ok', uptime, timestamp }
 * GET /api/health/ready     → 200 if DB connection is alive, 503 otherwise
 *
 * Used by:
 *   - ensure-servers (test-api / test-browser) to confirm the backend is up
 *   - Docker / k8s probes in production
 *   - smoke-test agent
 *
 * @Public — these endpoints must be reachable without auth.
 */
import { Controller, Get, HttpCode, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Liveness probe — process is responsive' })
  @ApiResponse({ status: 200, description: 'OK' })
  liveness() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @Public()
  @HttpCode(200)
  @ApiOperation({ summary: 'Readiness probe — process can serve traffic' })
  @ApiResponse({ status: 200, description: 'Ready' })
  @ApiResponse({ status: 503, description: 'Not ready (DB unreachable)' })
  async readiness() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ready',
        database: 'ok',
        timestamp: new Date().toISOString(),
      };
    } catch (_err) {
      throw new ServiceUnavailableException({
        status: 'not_ready',
        database: 'unreachable',
        timestamp: new Date().toISOString(),
      });
    }
  }
}
