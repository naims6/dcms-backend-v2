import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Apply a strict rate limit for sensitive auth endpoints.
 * Overrides the global throttler with: 5 requests per 60 seconds per IP.
 *
 * Usage:
 * @AuthThrottle()
 * @Post('login')
 * async login() {}
 */
export const AuthThrottle = () =>
  Throttle({ global: { ttl: 60_000, limit: 5 } });

/**
 * Apply a moderate rate limit for file upload endpoints.
 * Overrides the global throttler with: 10 requests per 60 seconds per IP.
 *
 * Usage:
 * @UploadThrottle()
 * @Post('upload')
 * async uploadFile() {}
 */
export const UploadThrottle = () =>
  Throttle({ global: { ttl: 60_000, limit: 10 } });

/**
 * Skip rate limiting entirely for a controller or handler.
 * Use for health checks or internal-only routes.
 *
 * Usage:
 * @SkipThrottle()
 * @Get('health')
 * async health() {}
 */
export { SkipThrottle };
