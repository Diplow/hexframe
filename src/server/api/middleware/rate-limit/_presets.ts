import { createRateLimitMiddleware, createVerificationAwareRateLimit } from "~/server/api/middleware/rate-limit/_middleware";
import { _getSafeMaxRequests, _getUserKeyGenerator } from "~/server/api/middleware/rate-limit/_utils";

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
    maxRequests: _getSafeMaxRequests(1000, 100), // 100 requests per minute (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  }),

  // Very strict for expensive operations (verified users)
  expensive: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10, // 10 requests per 5 minutes for verified users
    keyGenerator: _getUserKeyGenerator,
  }),

  // Extra strict for expensive operations (unverified users)
  expensiveUnverified: createRateLimitMiddleware({
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 3, // Only 3 requests per 5 minutes for unverified users
    keyGenerator: _getUserKeyGenerator,
  }),

  // Standard rate limit for verified users
  authenticatedVerified: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    keyGenerator: _getUserKeyGenerator,
  }),

  // Stricter rate limit for unverified users
  authenticatedUnverified: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // Only 20 requests per minute for unverified users
    keyGenerator: _getUserKeyGenerator,
  }),

  // Custom rate limit for mutations
  mutation: createRateLimitMiddleware({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: _getSafeMaxRequests(1000, 20), // 20 mutations per minute (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  }),
};

// Pre-configured verification-aware rate limiters
export const verificationAwareRateLimit = createVerificationAwareRateLimit(
  {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: _getSafeMaxRequests(1000, 10), // 10 requests per 5 minutes for verified users (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  },
  {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: _getSafeMaxRequests(1000, 3), // 3 requests per 5 minutes for unverified users (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  }
);

export const verificationAwareAuthLimit = createVerificationAwareRateLimit(
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: _getSafeMaxRequests(1000, 100), // 100 requests per minute for verified users (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  },
  {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: _getSafeMaxRequests(1000, 20), // 20 requests per minute for unverified users (1000 if debug enabled)
    keyGenerator: _getUserKeyGenerator,
  }
);
