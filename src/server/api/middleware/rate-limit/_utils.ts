import type { Context } from "~/server/api/trpc";

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const allowDebugRates = process.env.RATE_LIMIT_ALLOW_DEBUG === 'true';
const maxRequestsOverride = process.env.RATE_LIMIT_MAX_REQUESTS ? parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) : undefined;

// Helper to get safe rate limit values
export function _getSafeMaxRequests(debugValue: number, safeDefault: number): number {
  if (maxRequestsOverride && maxRequestsOverride > 0) {
    return maxRequestsOverride;
  }
  return (allowDebugRates && !isProduction) ? debugValue : safeDefault;
}

// Shared key generator for user-based rate limiting
export function _getUserKeyGenerator(ctx: Context): string {
  return ctx.user?.id ?? "anonymous";
}

// Helper to extract client IP from various headers
export function _getClientIp(ctx: Context): string | null {
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
