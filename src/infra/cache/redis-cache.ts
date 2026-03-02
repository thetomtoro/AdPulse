import Redis from 'ioredis';
import type { ICacheProvider } from '../interfaces.js';

export class RedisCacheProvider implements ICacheProvider {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async incrby(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  async getNumber(key: string): Promise<number> {
    const val = await this.client.get(key);
    return val ? parseInt(val, 10) || 0 : 0;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    await this.client.zadd(key, score, member);
  }

  async zremrangebyscore(key: string, min: number, max: number): Promise<number> {
    return this.client.zremrangebyscore(key, min, max);
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async expire(key: string, seconds: number): Promise<void> {
    await this.client.expire(key, seconds);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}
