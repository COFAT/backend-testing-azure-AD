import { Controller, Get, Inject } from '@nestjs/common';
import {
  HealthCheckService,
  HealthCheck,
  PrismaHealthIndicator,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private healthIndicatorService: HealthIndicatorService,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    return this.health.check([
      // 1. Check Database (Prisma)
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // 2. Robust Redis Health Check with Timeout using NestJS 11 HealthIndicatorService
      async () => {
        const indicator = this.healthIndicatorService.check('redis');

        const timeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Redis request timed out')), 2000),
        );

        try {
          // Race the timeout against the Redis operation to prevent hanging
          await Promise.race([
            this.cacheManager.set('health_check_test', 'ok', 10000),
            timeout,
          ]);

          const val = await this.cacheManager.get('health_check_test');
          if (val !== 'ok') throw new Error('Redis verification failed');

          return indicator.up();
        } catch (e: unknown) {
          const errorMessage = e instanceof Error ? e.message : 'Unknown error';
          return indicator.down({ message: errorMessage });
        }
      },
    ]);
  }
}
