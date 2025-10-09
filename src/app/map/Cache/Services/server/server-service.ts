"use client";

import { useMemo } from "react";
import { api } from "~/commons/trpc/react";
import type {
  ServerService,
  ServiceConfig,
} from "~/app/map/Cache/Services";
import { DEFAULT_CONFIG } from "~/app/map/Cache/Services/server/server-retry-utils";
import { createServerOperations } from "~/app/map/Cache/Services/server/server-operations";

/**
 * Pure server service factory function - easy to test with direct mocking
 * Only handles query operations with retry logic and error handling.
 * Mutations are handled by the mutation layer using tRPC hooks directly.
 *
 * @example
 * ```tsx
 * const mockUtils = { map: { getItemsForRootItem: { fetch: vi.fn() } } };
 * const service = createServerService(mockUtils, { retryAttempts: 5 });
 * ```
 */
export function createServerService(
  utils: ReturnType<typeof api.useUtils>,
  config: ServiceConfig = {},
): ServerService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return createServerOperations(utils, finalConfig);
}

/**
 * React hook wrapper for convenient usage in components.
 * Uses the pure service factory internally for consistency.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const serverService = useServerService({ retryAttempts: 5 });
 *
 *   const handleFetch = async () => {
 *     const items = await serverService.fetchItemsForCoordinate({
 *       centerCoordId: "1,2",
 *       maxDepth: 3
 *     });
 *   };
 * }
 * ```
 */
export function useServerService(config: ServiceConfig = {}): ServerService {
  const utils = api.useUtils();

  return useMemo(() => {
    return createServerService(utils, config);
  }, [utils, config]);
}

// Re-export testing utilities
export { createServerServiceFactory, createMockServerService } from "~/app/map/Cache/Services/server/server-test-utils";


// Legacy compatibility (deprecated)
export const createServerService_DEPRECATED = createServerService;
