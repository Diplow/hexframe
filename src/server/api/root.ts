import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { mapRouter, authRouter, userRouter, agenticRouter, mcpAuthRouter, favoritesRouter } from "~/server/api/routers";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here:
 * - map: Map operations and tile management
 * - auth: Authentication endpoints
 * - user: User profile and settings
 * - favorites: User tile favorites/bookmarks
 * - agentic: AI/LLM integration for chat functionality
 * - mcp: MCP API key management for external tool access
 */
export const appRouter = createTRPCRouter({
  map: mapRouter,
  auth: authRouter,
  user: userRouter,
  favorites: favoritesRouter,
  agentic: agenticRouter,
  mcp: mcpAuthRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.resource.all();
 *       ^? Resource[]
 */
export const createCaller = createCallerFactory(appRouter);
