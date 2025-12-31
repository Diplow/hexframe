import { TRPCError } from "@trpc/server";
import type { Context } from "~/server/api/trpc";
import type { RateLimitConfig } from "~/server/api/middleware/rate-limit/_types";
import { rateLimitStore } from "~/server/api/middleware/rate-limit/_store";
import { _getClientIp } from "~/server/api/middleware/rate-limit/_utils";

/**
 * Helper function to perform rate limiting logic
 */
export function _performRateLimit(config: RateLimitConfig, ctx: Context, isVerified?: boolean): void {
  const base = config.keyGenerator?.(ctx) ?? _getClientIp(ctx);
  const key = base?.trim() ? base : `anon:${ctx.req?.headers["user-agent"] ?? "unknown"}`;

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
export function _handlePostRequest(config: RateLimitConfig, ctx: Context, success: boolean): void {
  const base = config.keyGenerator?.(ctx) ?? _getClientIp(ctx);
  const key = base?.trim() ? base : `anon:${ctx.req?.headers["user-agent"] ?? "unknown"}`;

  const rateLimit = rateLimitStore.get(key);
  if (!rateLimit) return;

  if (config.skipSuccessfulRequests && !success) {
    rateLimit.count++;
  }
  // Otherwise, count was applied pre-request; don't decrement on failures.
}
