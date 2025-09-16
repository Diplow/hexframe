import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { mapRouter } from "~/server/api/routers/map";
import { authRouter } from "~/server/api/routers/auth";
import { userRouter } from "~/server/api/routers/user";
import { agenticRouter } from "~/server/api/routers/agentic";
import { mcpAuthRouter } from "~/server/api/routers/mcp/auth";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here:
 * - map: Map operations and tile management
 * - auth: Authentication endpoints
 * - user: User profile and settings
 * - agentic: AI/LLM integration for chat functionality
 * - mcp: MCP API key management for external tool access
 */
export const appRouter = createTRPCRouter({
  map: mapRouter,
  auth: authRouter,
  user: userRouter,
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
