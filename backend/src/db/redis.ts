import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;

if (!redisUrl) {
  throw new Error('Redis URL not configured');
}

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

redis.on('error', (err) => {
  logger.error('Redis error:', err);
});

// Cache helper functions
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttlSeconds: number = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async getMenuContext(restaurantId: string) {
    return this.get(`menu:${restaurantId}`);
  },

  async setMenuContext(restaurantId: string, menuData: any) {
    await this.set(`menu:${restaurantId}`, menuData, 3600); // 1 hour
  },

  async getSessionContext(sessionId: string) {
    return this.get(`session:${sessionId}`);
  },

  async setSessionContext(sessionId: string, context: any) {
    await this.set(`session:${sessionId}`, context, 1800); // 30 minutes
  },

  async incrementRateLimit(identifier: string, windowSeconds: number = 60): Promise<number> {
    const key = `ratelimit:${identifier}`;
    const count = await redis.incr(key);
    
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }
    
    return count;
  }
};
