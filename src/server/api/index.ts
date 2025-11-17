/**
 * Server API Public Interface
 *
 * Provides access to tRPC configuration, routers, and types for external consumption.
 */

// Main tRPC configuration and context
export { createContext, createCallerFactory } from '~/server/api/trpc';

// Root router combining all sub-routers
export { appRouter, createCaller } from '~/server/api/root';

// API types and contracts
export type { AppRouter } from '~/server/api/root';
export type * from '~/server/api/types/contracts';

// Middleware exports for advanced usage
export { verificationAwareRateLimit, verificationAwareAuthLimit } from '~/server/api/middleware';