import type { Context } from "~/server/api/trpc";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (ctx: Context) => string; // Custom key generator
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitEntry | undefined>;
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;
  delete(key: string): Promise<void>;
  cleanup(): Promise<void>;
}
