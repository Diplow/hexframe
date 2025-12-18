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
import { db } from "~/server/db";
import { loggers } from "~/lib/debug/debug-logger";
import { 
  MappingService, 
  DbMapItemRepository, 
  DbBaseItemRepository 
} from "~/lib/domains/mapping";
import {
  IAMService,
  BetterAuthUserRepository,
  getOrCreateInternalApiKey
} from "~/lib/domains/iam";
import { createAgenticServiceAsync } from "~/lib/domains/agentic";
import { EventBus as EventBusImpl } from "~/lib/utils/event-bus";
import { env } from "~/env";
import type { IncomingHttpHeaders } from "http";

/**
 * Helper function to extract API key from headers
 */
function getApiKeyFromHeaders(headers: IncomingHttpHeaders | Headers): string | undefined {
  if (headers instanceof Headers) {
    return headers.get('x-api-key') ?? undefined;
  }
  const apiKey = headers["x-api-key"];
  return Array.isArray(apiKey) ? apiKey[0] : apiKey;
}

/**
 * Derive sandbox session ID from authentication context.
 *
 * Derivation rules:
 * - Web UI sessions (better-auth): Use session.id as sandboxSessionId
 * - API key auth: Use userId + "-api-key" suffix as sandboxSessionId
 * - Anonymous users: sandboxSessionId is undefined (ephemeral sandbox)
 */
export function deriveSandboxSessionId(context: {
  session?: { id: string; userId: string } | null;
  user?: { id: string } | null;
  authMethod?: "session" | "internal-api-key" | "external-api-key" | "anonymous";
}): string | undefined {
  // Web UI session authentication - use the stable session.id
  if (context.session?.id) {
    return context.session.id;
  }

  // API key authentication - derive from userId with suffix
  if (context.authMethod === "internal-api-key" || context.authMethod === "external-api-key") {
    if (context.user?.id) {
      return `${context.user.id}-api-key`;
    }
  }

  // Anonymous users get undefined (ephemeral sandbox)
  return undefined;
}

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

  try {
    const sessionData = await auth.api.getSession({
      headers: sessionAPIAcceptableHeaders,
      // `request` property removed as it's not accepted by getSession according to linter
    });

    loggers.api(`TRPC CONTEXT: Session data from better-auth`, {
      hasSessionData: !!sessionData,
      hasSession: !!sessionData?.session,
      hasUser: !!sessionData?.user,
    });

    return {
      req,
      res,
      db,
      session: sessionData ? sessionData.session : null,
      user: sessionData ? sessionData.user : null,
      headers: req.headers, // Keep original IncomingHttpHeaders for other parts of context if needed
    };
  } catch {
    // If session retrieval fails, continue with null session (API key auth can still work)
    return {
      req,
      res,
      db,
      session: null,
      user: null,
      headers: req.headers,
    };
  }
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
export const t = initTRPC.context<typeof createContext>().create({
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
const timingMiddleware = t.middleware(async ({ next, path, ctx, input, type }) => {
  const start = Date.now();
  const requestId = `${type}-${path}-${Math.random().toString(36).substring(7)}`;

  loggers.api(`TRPC SERVER ${type.toUpperCase()}: ${path}`, {
    requestId,
    type,
    path,
    input: input,
    userId: ctx.user?.id,
    userEmail: ctx.user?.email,
    hasSession: !!ctx.session
  });

  if (process.env.NODE_ENV !== 'production') {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  try {
    const result = await next();
    const end = Date.now();
    
    loggers.api(`TRPC SERVER RESPONSE: ${path} (${end - start}ms)`, {
      requestId,
      type,
      path,
      userId: ctx.user?.id
    });

    return result;
  } catch (error) {
    const end = Date.now();
    
    loggers.api(`TRPC SERVER ERROR: ${path} (${end - start}ms)`, {
      requestId,
      type,
      path,
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : error,
      input: input,
      userId: ctx.user?.id
    });
    
    throw error;
  }
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
 * Soft Authentication Procedure
 *
 * Extracts user identity if authentication is present (session OR API key),
 * but does NOT fail if unauthenticated. This enables:
 * - Anonymous users to access public resources
 * - Authenticated users (via session or API key) to access their private resources
 *
 * Use this for read operations that need to support both anonymous and authenticated access.
 */
export const softAuthProcedure = t.procedure.use(timingMiddleware).use(async ({ ctx, next }) => {
  // First, check if session auth already succeeded in createContext
  if (ctx.user) {
    return next({
      ctx: {
        ...ctx,
        authMethod: 'session' as const,
      },
    });
  }

  // Try API key authentication
  const apiKey = getApiKeyFromHeaders(ctx.headers);
  if (apiKey) {
    try {
      // Try internal API key first (from IAM domain, for MCP server-to-server auth)
      const { validateInternalApiKey } = await import('~/lib/domains/iam');
      const userIdHint = ctx.headers instanceof Headers
        ? ctx.headers.get('x-user-id') ?? undefined
        : (Array.isArray(ctx.headers['x-user-id']) ? ctx.headers['x-user-id'][0] : ctx.headers['x-user-id']);
      const internalResult = await validateInternalApiKey(apiKey, userIdHint);

      if (internalResult) {
        return next({
          ctx: {
            ...ctx,
            user: { id: internalResult.userId },
            authMethod: 'internal-api-key' as const,
          },
        });
      }

      // Try external API key (better-auth)
      const result = await auth.api.verifyApiKey({
        body: { key: apiKey }
      });

      if (result.valid && result.key?.userId) {
        return next({
          ctx: {
            ...ctx,
            user: { id: result.key.userId },
            authMethod: 'external-api-key' as const,
          },
        });
      }
    } catch {
      // API key validation failed - continue as anonymous
    }
  }

  // No valid authentication - continue as anonymous
  return next({
    ctx: {
      ...ctx,
      user: null,
      authMethod: 'anonymous' as const,
    },
  });
});

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

/**
 * MCP API Key authenticated procedure
 *
 * This procedure authenticates requests using API keys from the x-api-key header.
 * Supports both:
 * - External API keys (user-created, hashed) for third-party integrations
 * - Internal API keys (system-created, encrypted) for MCP server-to-server auth
 */
export const mcpAuthProcedure = t.procedure.use(async ({ ctx, next }) => {
  const apiKey = getApiKeyFromHeaders(ctx.headers);

  if (!apiKey) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "API key required"
    });
  }

  try {
    // Try internal API key first (from IAM domain, for MCP server-to-server auth)
    const { validateInternalApiKey } = await import('~/lib/domains/iam');
    const userIdHint = ctx.headers instanceof Headers
      ? ctx.headers.get('x-user-id') ?? undefined
      : (Array.isArray(ctx.headers['x-user-id']) ? ctx.headers['x-user-id'][0] : ctx.headers['x-user-id']);
    const internalResult = await validateInternalApiKey(apiKey, userIdHint);

    if (internalResult) {
      // Internal key validated - create user context
      const user = { id: internalResult.userId };

      return next({
        ctx: {
          ...ctx,
          user,
          session: null,
          apiKeyAuth: true,
          internalApiKey: true, // Flag to indicate this is internal key
        },
      });
    }

    // Fall back to external API key validation (better-auth)
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey }
    });

    if (!result.valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid API key"
      });
    }

    // Create a user context from the external API key
    const user = { id: result.key?.userId ?? "" };

    return next({
      ctx: {
        ...ctx,
        user,
        session: null,
        apiKeyAuth: true,
        internalApiKey: false, // External key
      },
    });
  } catch (error) {
    // Re-throw TRPC errors as-is, wrap others
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "API key validation failed"
    });
  }
});

/**
 * Dual Authentication Procedure
 * 
 * Supports both traditional session auth and MCP API key auth.
 * Tries session auth first, falls back to API key auth.
 */
export const dualAuthProcedure = t.procedure.use(async ({ ctx, next }) => {
  // First try traditional session auth
  if (ctx.session && ctx.user) {
    return next({
      ctx: {
        ...ctx,
        session: { ...ctx.session },
        user: { ...ctx.user },
        apiKeyAuth: false,
      },
    });
  }

  // Fall back to API key auth
  const apiKey = getApiKeyFromHeaders(ctx.headers);

  if (!apiKey) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication required - provide session or API key"
    });
  }

  try {
    // Try internal API key first (from IAM domain)
    const { validateInternalApiKey } = await import('~/lib/domains/iam');
    const userIdHint = ctx.headers instanceof Headers
      ? ctx.headers.get('x-user-id') ?? undefined
      : (Array.isArray(ctx.headers['x-user-id']) ? ctx.headers['x-user-id'][0] : ctx.headers['x-user-id']);
    const internalResult = await validateInternalApiKey(apiKey, userIdHint);

    if (internalResult) {
      const user = { id: internalResult.userId };

      return next({
        ctx: {
          ...ctx,
          user,
          session: null,
          apiKeyAuth: true,
          internalApiKey: true,
        },
      });
    }

    // Fall back to external API key (better-auth)
    const result = await auth.api.verifyApiKey({
      body: { key: apiKey }
    });

    if (!result.valid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid API key"
      });
    }

    const userId = result.key?.userId;
    if (!userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "API key not linked to a user" });
    }
    const user = { id: userId };

    return next({
      ctx: {
        ...ctx,
        user,
        session: null,
        apiKeyAuth: true,
        internalApiKey: false,
      },
    });
  } catch (error) {
    // Re-throw TRPC errors as-is
    if (error instanceof TRPCError) {
      throw error;
    }

    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Authentication failed"
    });
  }
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

export const agenticServiceMiddleware = t.middleware(async ({ ctx, next }) => {
  const eventBus = new EventBusImpl();

  // Derive user ID from session or context (may be set by softAuthProcedure)
  const userId = ctx.session?.userId ?? (ctx.user as { id: string } | null)?.id;

  // Fetch MCP API key (10-min TTL, cached)
  const mcpApiKey = userId
    ? await getOrCreateInternalApiKey(userId, 'mcp-session', 10)
    : undefined;

  // Derive sandbox session ID for persistent sandbox sessions
  const sandboxSessionId = deriveSandboxSessionId({
    session: ctx.session,
    user: ctx.user as { id: string } | null,
    authMethod: (ctx as { authMethod?: "session" | "internal-api-key" | "external-api-key" | "anonymous" }).authMethod,
  });

  // Use async factory to support session-based sandbox reuse
  const agenticService = await createAgenticServiceAsync({
    llmConfig: {
      openRouterApiKey: env.OPENROUTER_API_KEY ?? '',
      anthropicApiKey: env.ANTHROPIC_API_KEY ?? '',
      preferClaudeSDK: true,
      useSandbox: env.USE_SANDBOX === 'true',
      mcpApiKey
    },
    eventBus,
    useQueue: false,
    userId: userId ?? 'anonymous',
    sessionId: sandboxSessionId
  });

  return next({
    ctx: {
      ...ctx,
      agenticService,
      eventBus,
      mcpApiKey,
      sandboxSessionId
    },
  });
});
