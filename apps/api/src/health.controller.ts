import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './core/database/prisma.service';
import { RedisService } from './core/redis/redis.service';

@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  async check() {
    const checks = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {} as Record<string, string>,
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.services.database = 'ok';
    } catch (error) {
      checks.services.database = 'error';
      checks.status = 'degraded';
    }

    try {
      await this.redis.ping();
      checks.services.redis = 'ok';
    } catch (error) {
      checks.services.redis = 'error';
      checks.status = 'degraded';
    }

    return checks;
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.redis.ping();
      return { status: 'ok' };
    } catch (error) {
      this.logger.error('Readiness check failed', error);
      return { status: 'not ready' };
    }
  }
}
