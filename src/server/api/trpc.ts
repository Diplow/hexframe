/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "~/server/auth";
import { db } from "../db";
import { MappingService } from "~/lib/domains/mapping/services/mapping.service";
import { DbMapItemRepository } from "~/lib/domains/mapping/infrastructure/map-item/db";
import { DbBaseItemRepository } from "~/lib/domains/mapping/infrastructure/base-item/db";
import { IAMService } from "~/lib/domains/iam/services/iam.service";
import { BetterAuthUserRepository } from "~/lib/domains/iam/infrastructure/user/better-auth-repository";
import type { IncomingHttpHeaders } from "http";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */

// Helper to convert NextApiRequest headers to Fetch API Headers
// This function will also be used by routers, so it's defined here.
export function convertToHeaders(
  incomingHeaders: IncomingHttpHeaders,
): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(incomingHeaders)) {
    if (value) {
      if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      } else {
        headers.append(key, value);
      }
    }
  }
  return headers;
}

export type Context = Awaited<ReturnType<typeof createContext>>;

export const createContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  let sessionAPIAcceptableHeaders: Headers;

  if (req.headers instanceof Headers) {
    // If req.headers is already a Fetch API Headers object (e.g., coming from App Router adapter)
    sessionAPIAcceptableHeaders = req.headers;
  } else {
    // Otherwise, assume it's IncomingHttpHeaders (e.g., from Pages Router or direct NextApiRequest)
    // and convert it.
    sessionAPIAcceptableHeaders = convertToHeaders(req.headers);
  }

  const sessionData = await auth.api.getSession({
    headers: sessionAPIAcceptableHeaders,
    // `request` property removed as it's not accepted by getSession according to linter
  });
  
  console.log("[TRPC CONTEXT] Session data from better-auth:", {
    hasSessionData: !!sessionData,
    hasSession: !!sessionData?.session,
    hasUser: !!sessionData?.user,
    userId: sessionData?.user?.id,
    userEmail: sessionData?.user?.email,
    sessionId: sessionData?.session?.id,
    cookieHeader: sessionAPIAcceptableHeaders.get('cookie'),
  });

  return {
    req,
    res,
    db,
    session: sessionData ? sessionData.session : null,
    user: sessionData ? sessionData.user : null,
    headers: req.headers, // Keep original IncomingHttpHeaders for other parts of context if needed
  };
};

/**
 * Inner context creator useful for testing - accepts db directly
 */
export const createInnerTRPCContext = (_opts: Record<string, never>) => {
  return {
    headers: new Headers(),
    db: db,
    session: null,
    user: null,
    req: undefined as unknown,
    res: undefined as unknown,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * This procedure ensures that the user is authenticated before executing.
 * If the user is not authenticated, it will throw an unauthorized error.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session || !ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      // infers the `session` as non-nullable
      session: { ...ctx.session }, // Spread to ensure non-nullable type if TS infers it
      user: { ...ctx.user }, // Spread to ensure non-nullable type
      db: ctx.db,
      req: ctx.req,
      res: ctx.res,
      headers: ctx.headers, // Forward original headers
    },
  });
});

// Service middlewares
export const mappingServiceMiddleware = t.middleware(async ({ ctx, next }) => {
  const repositories = {
    mapItem: new DbMapItemRepository(db),
    baseItem: new DbBaseItemRepository(db),
  };
  const mappingService = new MappingService(repositories);
  return next({
    ctx: {
      ...ctx,
      mappingService,
    },
  });
});

export const iamServiceMiddleware = t.middleware(async ({ ctx, next }) => {
  const repositories = {
    user: new BetterAuthUserRepository(auth, db),
  };
  const iamService = new IAMService(repositories);
  return next({
    ctx: {
      ...ctx,
      iamService,
    },
  });
});
