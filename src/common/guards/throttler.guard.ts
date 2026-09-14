import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Custom throttler guard that:
 * - Reads the real client IP from `X-Forwarded-For` when behind a proxy/load balancer.
 * - Falls back to `req.ip` (socket remote address) for direct connections.
 *
 * Registered globally via APP_GUARD so it applies to every route automatically.
 * Use @SkipThrottle() on controllers/handlers to opt out.
 * Use @Throttle() overrides to set per-route limits.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, unknown>): Promise<string> {
    const request = req as unknown as Request;
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : forwarded.split(',')[0];
      return Promise.resolve(ip.trim());
    }
    return Promise.resolve(request.ip ?? 'unknown');
  }
}
