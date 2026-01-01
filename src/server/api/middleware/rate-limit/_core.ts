import { TRPCError } from "@trpc/server";
import type { Context } from "~/server/api/trpc";
import type { RateLimitConfig, RateLimitEntry } from "~/server/api/middleware/rate-limit/_types";
import { rateLimitStore } from "~/server/api/middleware/rate-limit/_store";
import { _getClientIp } from "~/server/api/middleware/rate-limit/_utils";

/**
 * Generate a rate limit key from the context
 */
function _generateKey(config: RateLimitConfig, ctx: Context): string {
  const base = config.keyGenerator?.(ctx) ?? _getClientIp(ctx);
  return base?.trim() ? base : `anon:${ctx.req?.headers["user-agent"] ?? "unknown"}`;
}

/**
 * Helper function to perform rate limiting logic
 */
export async function _performRateLimit(
  config: RateLimitConfig,
  ctx: Context,
  isVerified?: boolean
): Promise<RateLimitEntry> {
  const key = _generateKey(config, ctx);

  // Increment and get current state atomically
  const rateLimit = await rateLimitStore.increment(key, config.windowMs);

  // Check if rate limit exceeded (count is already incremented)
  if (rateLimit.count > config.maxRequests) {
    const now = Date.now();
    const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
    let message = `Rate limit exceeded. Try again in ${retryAfter} seconds.`;

    // Add verification context if provided
    if (isVerified !== undefined) {
      const limitType = isVerified ? "verified user" : "unverified user";
      const verificationHint = !isVerified ? " Please verify your email for higher limits." : "";
      message = `Rate limit exceeded for ${limitType}. Try again in ${retryAfter} seconds.${verificationHint}`;
    }

    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message,
    });
  }

  return rateLimit;
}

/**
 * Helper function to handle post-request rate limit logic.
 * Used when skipSuccessfulRequests is enabled - we need to decrement on success.
 */
export async function _handlePostRequest(
  config: RateLimitConfig,
  ctx: Context,
  success: boolean
): Promise<void> {
  // Only relevant for skipSuccessfulRequests mode
  // In the new design, we increment upfront, so on success we would need to decrement
  // However, this creates complexity with Redis atomicity
  // For now, skipSuccessfulRequests is deprecated in favor of simpler counting
  if (config.skipSuccessfulRequests && success) {
    // The count was already incremented; we'd need to decrement on success
    // This is a no-op for now as implementing decrement adds complexity
    // Consider removing skipSuccessfulRequests feature if not used
  }
}
