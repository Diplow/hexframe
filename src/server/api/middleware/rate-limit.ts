import { TRPCError } from "@trpc/server";
import { t, type Context } from "~/server/api/trpc";
import { loggers } from "~/lib/debug/debug-logger";

// Helper to extract client IP from various headers
function getClientIp(ctx: Context): string | null {
  const headers = ctx.req?.headers;
  if (!headers) return null;
  
  // Check various headers that might contain the client IP
  const forwardedFor = headers["x-forwarded-for"];
  if (forwardedFor) {
    // x-forwarded-for can be comma-separated list, take the first one
    const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    return ips?.split(',')[0]?.trim() ?? null;
  }
  
  const realIp = headers["x-real-ip"];
  if (realIp) {
    return Array.isArray(realIp) ? (realIp[0] ?? null) : realIp;
  }
  
  // Vercel-specific headers
  const vercelIp = headers["x-vercel-forwarded-for"];
  if (vercelIp) {
    return Array.isArray(vercelIp) ? (vercelIp[0] ?? null) : vercelIp;
  }
  
  return null;
}

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  keyGenerator?: (ctx: Context) => string; // Custom key generator
}

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute


// Preset configurations
export const rateLimits = {
  // Strict limit for public endpoints
  public: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
  }),
  
  // More lenient for authenticated users
  authenticated: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
  
  // Very strict for expensive operations (verified users)
  expensive: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes for verified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
  
  // Extra strict for expensive operations (unverified users)
  expensiveUnverified: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // Only 3 requests per 5 minutes for unverified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
  
  // Standard rate limit for verified users
  authenticatedVerified: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
  
  // Stricter rate limit for unverified users
  authenticatedUnverified: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Only 20 requests per minute for unverified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
  
  // Custom rate limit for mutations
  mutation: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 mutations per minute
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }),
};

/**
 * Helper function to perform rate limiting logic
 */
function performRateLimit(config: RateLimitConfig, ctx: Context, isVerified?: boolean): void {
  const key = config.keyGenerator
    ? config.keyGenerator(ctx)
    : getClientIp(ctx) ?? "anonymous";

  const now = Date.now();
  const resetTime = now + config.windowMs;

  // Get or create rate limit entry
  let rateLimit = rateLimitStore.get(key);
  
  if (!rateLimit || rateLimit.resetTime < now) {
    rateLimit = { count: 0, resetTime };
    rateLimitStore.set(key, rateLimit);
  }

  // Check if rate limit exceeded
  if (rateLimit.count >= config.maxRequests) {
    const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
    let message = `Rate limit exceeded. Try again in ${retryAfter} seconds.`;
    
    // Add verification context if provided
    if (isVerified !== undefined) {
      const limitType = isVerified ? "verified user" : "unverified user";
      const verificationHint = !isVerified ? ' Please verify your email for higher limits.' : '';
      message = `Rate limit exceeded for ${limitType}. Try again in ${retryAfter} seconds.${verificationHint}`;
    }
    
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message,
    });
  }

  // Increment counter if not skipping successful requests
  if (!config.skipSuccessfulRequests) {
    rateLimit.count++;
  }
}

/**
 * Helper function to handle post-request rate limit logic
 */
function handlePostRequest(config: RateLimitConfig, ctx: Context, success: boolean): void {
  const key = config.keyGenerator
    ? config.keyGenerator(ctx)
    : getClientIp(ctx) ?? "anonymous";
    
  const rateLimit = rateLimitStore.get(key);
  if (!rateLimit) return;

  if (config.skipSuccessfulRequests && success) {
    rateLimit.count++;
  } else if (!config.skipSuccessfulRequests && !success) {
    rateLimit.count--;
  }
}

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return t.middleware(async ({ ctx, next }) => {
    performRateLimit(config, ctx);

    try {
      const result = await next();
      handlePostRequest(config, ctx, true);
      return result;
    } catch (error) {
      handlePostRequest(config, ctx, false);
      throw error;
    }
  });
}

/**
 * Creates a middleware that applies different rate limits based on email verification status
 * Use this for expensive operations like AI API calls
 */
export function createVerificationAwareRateLimit(
  verifiedConfig: RateLimitConfig,
  unverifiedConfig: RateLimitConfig
) {
  return t.middleware(async ({ ctx, next }) => {
    // Check if user is verified
    const isVerified = ctx.user?.emailVerified ?? false;
    
    loggers.api(`Rate limit check`, { userId: ctx.user?.id, verified: !!isVerified });
    
    // Apply the appropriate rate limit config
    const config = isVerified ? verifiedConfig : unverifiedConfig;
    
    // Perform rate limiting with verification context
    performRateLimit(config, ctx, isVerified);

    try {
      const result = await next();
      handlePostRequest(config, ctx, true);
      return result;
    } catch (error) {
      handlePostRequest(config, ctx, false);
      throw error;
    }
  });
}

// Pre-configured verification-aware rate limiters
export const verificationAwareRateLimit = createVerificationAwareRateLimit(
  {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes for verified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  },
  {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // Only 3 requests per 5 minutes for unverified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }
);

export const verificationAwareAuthLimit = createVerificationAwareRateLimit(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute for verified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  },
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Only 20 requests per minute for unverified users
    keyGenerator: (ctx) => ctx.user?.id ?? "anonymous",
  }
);