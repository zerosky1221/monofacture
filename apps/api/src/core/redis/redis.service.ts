import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

interface RedisOptions {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(@Inject('REDIS_OPTIONS') private readonly options: RedisOptions) {
    this.client = new Redis({
      host: options.host,
      port: options.port,
      password: options.password,
      db: options.db || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  }

  async onModuleInit() {
    this.client.on('connect', () => {
      this.logger.log('Redis connection established');
    });

    this.client.on('error', (error) => {
      this.logger.error('Redis connection error:', error);
    });
  }

  async onModuleDestroy() {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  getClient(): Redis {
    return this.client;
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value, (_, v) =>
      typeof v === 'bigint' ? v.toString() : v
    );
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string | string[]): Promise<number> {
    return this.client.del(...(Array.isArray(key) ? key : [key]));
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    const values = await this.client.mget(keys);
    return values.map((value) => {
      if (!value) return null;
      try {
        return JSON.parse(value) as T;
      } catch {
        return value as T;
      }
    });
  }

  async mset<T>(data: Record<string, T>): Promise<void> {
    const flattened: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      flattened.push(key, typeof value === 'string' ? value : JSON.stringify(value, (_, v) =>
        typeof v === 'bigint' ? v.toString() : v
      ));
    }
    await this.client.mset(...flattened);
  }

  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.client.sadd(key, ...members);
  }

  async smembers(key: string): Promise<string[]> {
    return this.client.smembers(key);
  }

  async srem(key: string, ...members: string[]): Promise<number> {
    return this.client.srem(key, ...members);
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const result = await this.client.sismember(key, member);
    return result === 1;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    return this.client.hget(key, field);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async delByPattern(pattern: string): Promise<number> {
    const keys = await this.client.keys(pattern);
    if (keys.length === 0) return 0;
    return this.client.del(...keys);
  }

  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }
}
