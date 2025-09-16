import {
  fetchRequestHandler,
  type FetchCreateContextFnOptions,
} from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { env } from "~/env";
import { appRouter } from "~/server/api";
import { createContext as apiCreateContext } from "~/server/api";

/**
 * This function is passed to `fetchRequestHandler`.
 * It adapts the options from `fetchRequestHandler` and calls the main application context creator (`apiCreateContext`).
 */
const trpcContextAdapter = async (opts: FetchCreateContextFnOptions) => {
  // apiCreateContext (from ~/server/api/trpc.ts) expects an object with req, res, and info properties.
  // We adapt from FetchCreateContextFnOptions to satisfy this.

  // For `req`, apiCreateContext likely expects an object with at least `headers`.
  // It might have been typed for NextApiRequest, so we provide a compatible structure.
  const adaptedReq = {
    headers: opts.req.headers,
    // query: Object.fromEntries(new URL(opts.req.url).searchParams), // Example if query params were needed by apiCreateContext
  } as unknown as Parameters<typeof apiCreateContext>[0]["req"]; // Using 'as any' because NextRequest and NextApiRequest are different.

  // For `res`, apiCreateContext might expect a NextApiResponse-like object.
  // In the RSC setup, `undefined` was passed. We'll do the same for now.
  const adaptedRes = undefined as unknown as Parameters<
    typeof apiCreateContext
  >[0]["res"];

  return apiCreateContext({
    req: adaptedReq,
    res: adaptedRes,
    info: opts.info, // Pass the info from fetchRequestHandler directly
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/services/api/trpc",
    req, // Pass the original NextRequest to fetchRequestHandler
    router: appRouter,
    createContext: trpcContextAdapter, // Use our adapter function
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
