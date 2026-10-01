import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';
import {
  BypassResponseTransform,
  ResponseMessage,
} from './common/decorators/response-message.decorator.js';
import { Public } from './common/decorators/public.decorator.js';
import { SkipThrottle } from './common/decorators/throttle.decorator.js';
import { PrismaService } from './prisma/prisma.service.js';
import { RedisService } from './redis/redis.service.js';

interface HealthCheckResult {
  status: 'ok' | 'error';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  @Public()
  @ResponseMessage('App welcome message fetched successfully')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @Public()
  @SkipThrottle()
  @BypassResponseTransform()
  async health(): Promise<HealthCheckResult> {
    const [database, redis] = await Promise.allSettled([
      this.prisma.$queryRaw`SELECT 1`,
      this.redis.ping(),
    ]);

    const result: HealthCheckResult = {
      status: 'ok',
      services: {
        database: database.status === 'fulfilled' ? 'up' : 'down',
        redis: redis.status === 'fulfilled' ? 'up' : 'down',
      },
      timestamp: new Date().toISOString(),
    };

    if (
      result.services.database === 'down' ||
      result.services.redis === 'down'
    ) {
      result.status = 'error';
      const failed = [
        result.services.database === 'down' ? 'database' : null,
        result.services.redis === 'down' ? 'redis' : null,
      ]
        .filter((service): service is string => service !== null)
        .join(', ');

      throw new ServiceUnavailableException(
        `Health check failed. Unavailable services: ${failed}`,
      );
    }

    return result;
  }
}
