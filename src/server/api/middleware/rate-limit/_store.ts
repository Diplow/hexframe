import type { RateLimitStore } from "~/server/api/middleware/rate-limit/_types";

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';

// In-memory store implementation
class InMemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { count: number; resetTime: number }>();

  get(key: string) {
    return this.store.get(key);
  }

  set(key: string, value: { count: number; resetTime: number }) {
    this.store.set(key, value);
  }

  delete(key: string) {
    this.store.delete(key);
  }

  entries() {
    return this.store.entries();
  }
}

// Redis store implementation (production)
class RedisRateLimitStore implements RateLimitStore {
  // For now, fall back to in-memory if Redis is not properly configured
  // TODO: Implement actual Redis integration when REDIS_URL is available
  private fallback = new InMemoryRateLimitStore();

  get(key: string) {
    return this.fallback.get(key);
  }

  set(key: string, value: { count: number; resetTime: number }) {
    this.fallback.set(key, value);
  }

  delete(key: string) {
    this.fallback.delete(key);
  }

  entries() {
    return this.fallback.entries();
  }
}

// Choose store based on environment
export const rateLimitStore: RateLimitStore = (() => {
  if (isProduction || process.env.REDIS_URL) {
    return new RedisRateLimitStore();
  }
  return new InMemoryRateLimitStore();
})();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
