import type { Context } from "~/server/api/trpc";

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (ctx: Context) => string; // Custom key generator
}

export interface RateLimitStore {
  get(key: string): { count: number; resetTime: number } | undefined;
  set(key: string, value: { count: number; resetTime: number }): void;
  delete(key: string): void;
  entries(): IterableIterator<[string, { count: number; resetTime: number }]>;
}
