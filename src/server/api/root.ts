import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { mapRouter } from "~/server/api/routers/map";
import { authRouter } from "~/server/api/routers/auth";
import { userRouter } from "~/server/api/routers/user";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  map: mapRouter,
  auth: authRouter,
  user: userRouter,
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
