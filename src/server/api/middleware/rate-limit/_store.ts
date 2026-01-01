import { Redis } from "@upstash/redis";
import type { RateLimitStore, RateLimitEntry } from "~/server/api/middleware/rate-limit/_types";

const LOG_PREFIX = "[RateLimitStore]";

/**
 * In-memory store implementation for local development.
 */
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();

  async get(key: string): Promise<RateLimitEntry | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    // Check if expired
    if (entry.resetTime < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    // If entry exists and not expired, increment
    if (existing && existing.resetTime >= now) {
      existing.count++;
      return existing;
    }

    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + windowMs,
    };
    this.store.set(key, newEntry);
    return newEntry;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, value] of this.store.entries()) {
      if (value.resetTime < now) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * Redis-backed store for production multi-instance deployments.
 * Uses Upstash Redis with atomic increment operations.
 */
class RedisRateLimitStore implements RateLimitStore {
  private redis: Redis;
  private keyPrefix = "rate-limit:";
  private fallback: InMemoryRateLimitStore;
  private redisAvailable = true;

  constructor(redis: Redis) {
    this.redis = redis;
    this.fallback = new InMemoryRateLimitStore();
  }

  private _getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async get(key: string): Promise<RateLimitEntry | undefined> {
    if (!this.redisAvailable) {
      return this.fallback.get(key);
    }

    try {
      const data = await this.redis.get<RateLimitEntry>(this._getKey(key));
      if (!data) return undefined;

      // Check if expired
      if (data.resetTime < Date.now()) {
        await this.delete(key);
        return undefined;
      }
      return data;
    } catch (error) {
      console.error(LOG_PREFIX, "Redis get failed, using fallback", { key, error });
      this._handleRedisError();
      return this.fallback.get(key);
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    if (!this.redisAvailable) {
      return this.fallback.increment(key, windowMs);
    }

    const redisKey = this._getKey(key);
    const now = Date.now();

    try {
      // Use Redis transaction for atomic read-modify-write
      const existing = await this.redis.get<RateLimitEntry>(redisKey);

      // If entry exists and not expired, increment
      if (existing && existing.resetTime >= now) {
        const updatedEntry: RateLimitEntry = {
          count: existing.count + 1,
          resetTime: existing.resetTime,
        };
        const remainingTtlSeconds = Math.ceil((existing.resetTime - now) / 1000);
        await this.redis.set(redisKey, updatedEntry, { ex: remainingTtlSeconds });
        return updatedEntry;
      }

      // Create new entry with TTL
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      const ttlSeconds = Math.ceil(windowMs / 1000);
      await this.redis.set(redisKey, newEntry, { ex: ttlSeconds });
      return newEntry;
    } catch (error) {
      console.error(LOG_PREFIX, "Redis increment failed, using fallback", { key, error });
      this._handleRedisError();
      return this.fallback.increment(key, windowMs);
    }
  }

  async delete(key: string): Promise<void> {
    if (!this.redisAvailable) {
      return this.fallback.delete(key);
    }

    try {
      await this.redis.del(this._getKey(key));
    } catch (error) {
      console.error(LOG_PREFIX, "Redis delete failed", { key, error });
      this._handleRedisError();
      await this.fallback.delete(key);
    }
  }

  async cleanup(): Promise<void> {
    // Redis handles TTL-based cleanup automatically
    // Only clean up the fallback store
    await this.fallback.cleanup();
  }

  private _handleRedisError(): void {
    if (this.redisAvailable) {
      this.redisAvailable = false;
      console.warn(LOG_PREFIX, "Redis unavailable, falling back to in-memory store");

      // Attempt to reconnect after 30 seconds
      setTimeout(() => {
        this.redisAvailable = true;
        console.log(LOG_PREFIX, "Re-enabling Redis connection");
      }, 30000);
    }
  }
}

/**
 * Create a rate limit store based on environment configuration.
 */
function _createRateLimitStore(): RateLimitStore {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    console.log(LOG_PREFIX, "Using Redis-backed rate limit store");
    const redis = new Redis({ url: redisUrl, token: redisToken });
    return new RedisRateLimitStore(redis);
  }

  console.log(LOG_PREFIX, "Redis not configured, using in-memory store");
  return new InMemoryRateLimitStore();
}

export const rateLimitStore: RateLimitStore = _createRateLimitStore();

// Clean up expired entries periodically (mainly for in-memory fallback)
setInterval(() => {
  void rateLimitStore.cleanup();
}, 60000);
