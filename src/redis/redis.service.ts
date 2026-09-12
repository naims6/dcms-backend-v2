import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { env } from '../config/env.config.js';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  onModuleInit(): void {
    this.client = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password || undefined,
      lazyConnect: true,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    });

    this.client.on('connect', () => {
      this.logger.log(
        `Connecting to Redis at ${env.redis.host}:${env.redis.port}...`,
      );
    });

    this.client.on('ready', () => {
      this.logger.log(`Redis connected and ready!`);
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis Error: ${err.message}`, err.stack);
    });

    // Connect asynchronously
    this.client.connect().catch((err: unknown) => {
      this.logger.error(
        `Failed to connect to Redis on startup: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.logger.log('Closing Redis connection...');
      await this.client.quit();
    }
  }

  /**
   * Access the raw ioredis instance for advanced commands (pipeline, multi, pub/sub, etc.)
   */
  getClient(): Redis {
    return this.client;
  }

  /**
   * Get string value by key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Set string value with optional TTL (in seconds)
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, value, 'EX', ttlSeconds);
    }
    return this.client.set(key, value);
  }

  /**
   * Delete one or multiple keys
   */
  async del(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  /**
   * Get parsed JSON object by key
   */
  async getJson<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set JSON object with optional TTL (in seconds)
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<'OK'> {
    const serialized = JSON.stringify(value);
    return this.set(key, serialized, ttlSeconds);
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }

  /**
   * Set TTL on key (in seconds)
   */
  async expire(key: string, ttlSeconds: number): Promise<number> {
    return this.client.expire(key, ttlSeconds);
  }

  /**
   * Get remaining TTL on key (in seconds)
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }
}
