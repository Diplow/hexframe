/**
 * Type-only exports for TRPC client
 * 
 * This file exports only types without any runtime code that could
 * pull server dependencies into the client bundle.
 */

import type { appRouter } from "./root";

export type AppRouter = typeof appRouter;