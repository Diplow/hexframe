import { t } from "~/server/api/trpc";
import { loggers } from "~/lib/debug/debug-logger";
import type { RateLimitConfig } from "~/server/api/middleware/rate-limit/_types";
import { _performRateLimit, _handlePostRequest } from "~/server/api/middleware/rate-limit/_core";

export function createRateLimitMiddleware(config: RateLimitConfig) {
  return t.middleware(async ({ ctx, next }) => {
    _performRateLimit(config, ctx);

    try {
      const result = await next();
      _handlePostRequest(config, ctx, true);
      return result;
    } catch (error) {
      _handlePostRequest(config, ctx, false);
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
    _performRateLimit(config, ctx, isVerified);

    try {
      const result = await next();
      _handlePostRequest(config, ctx, true);
      return result;
    } catch (error) {
      _handlePostRequest(config, ctx, false);
      throw error;
    }
  });
}
