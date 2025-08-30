"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { loggerLink, unstable_httpBatchStreamLink, type TRPCLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { useState } from "react";
import SuperJSON from "superjson";

import { type AppRouter } from "~/server/api/types";
import { createQueryClient } from "~/commons/trpc/query-client";
import { loggers } from "~/lib/debug/debug-logger";

// Custom debug logging link for comprehensive API call tracking
const debugLoggerLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    const startTime = Date.now();
    const requestId = `${op.type}-${op.path}-${Math.random().toString(36).substring(7)}`;
    
    // Log the request
    loggers.api(`tRPC ${op.type.toUpperCase()}: ${op.path}`, {
      requestId,
      type: op.type,
      path: op.path,
      input: op.input,
      context: op.context
    });

    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next(value) {
          const duration = Date.now() - startTime;
          loggers.api(`tRPC RESPONSE: ${op.path} (${duration}ms)`, {
            requestId,
            type: op.type,
            path: op.path,
            result: value
          });
          observer.next(value);
        },
        error(err) {
          const duration = Date.now() - startTime;
          loggers.api(`tRPC ERROR: ${op.path} (${duration}ms)`, {
            requestId,
            type: op.type,
            path: op.path,
            error: err,
            input: op.input,
            timestamp: new Date().toISOString(),
            stackTrace: err instanceof Error ? err.stack : undefined,
          });
          observer.error(err);
        },
        complete() {
          observer.complete();
        },
      });
      return unsubscribe;
    });
  };
};

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === "undefined") {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  return (clientQueryClientSingleton ??= createQueryClient());
};

export const api = createTRPCReact<AppRouter>();

/**
 * Inference helper for inputs.
 *
 * @example type HelloInput = RouterInputs['example']['hello']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;

/**
 * Inference helper for outputs.
 *
 * @example type HelloOutput = RouterOutputs['example']['hello']
 */
export type RouterOutputs = inferRouterOutputs<AppRouter>;

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        debugLoggerLink,
        loggerLink({
          enabled: (op) => {
            if (process.env.NODE_ENV === "development") return true;
            return op.direction === "down" && op.result instanceof Error;
          },
        }),
        unstable_httpBatchStreamLink({
          transformer: SuperJSON,
          url: getBaseUrl() + "/services/api/trpc",
          headers: () => {
            const headers = new Headers();
            headers.set("x-trpc-source", "nextjs-react");
            return headers;
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}

function getBaseUrl() {
  if (typeof window !== "undefined") return window.location.origin;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return `http://localhost:3000`;
}
