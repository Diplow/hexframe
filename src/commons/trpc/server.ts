import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { headers } from "next/headers";
import { cache } from "react";
import type { NextApiRequest, NextApiResponse } from "next";

import { createCaller, type AppRouter } from "~/server/api/root";
import { createContext as apiCreateContext } from "~/server/api/trpc";
import { createQueryClient } from "~/commons/trpc/query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  // AbortController is a global in modern Node.js and browsers
  const controller = new AbortController();

  return apiCreateContext({
    req: { headers: heads } as unknown as NextApiRequest, // Mocking req object for RSC
    res: undefined as unknown as NextApiResponse, // res is not available/needed in RSC context
    info: {
      accept: null,
      type: "query",
      isBatchCall: false,
      calls: [
        {
          path: "rsc",
          getRawInput: async () => undefined,
          result: () => undefined,
          procedure: null,
        },
      ],
      connectionParams: null,
      signal: controller.signal,
      url: null,
    },
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
