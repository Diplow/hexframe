import type { api } from "~/commons/trpc/react";
import { withRetry } from "~/app/map/Cache/Services/server/server-retry-utils";
import type { ServiceConfig } from "~/app/map/Cache/Services";
import { withErrorTransform } from "~/app/map/Cache/Services/server/server-operations";

/**
 * Create item-based query operations
 */
export function createItemOperations(
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) {
  const getRootItemById = async (mapItemId: number) => {
    const operation = async () => {
      const item = await utils.map.getRootItemById.fetch({ mapItemId });
      return item;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  const getDescendants = async (itemId: number) => {
    const operation = async () => {
      const descendants = await utils.map.getDescendants.fetch({ itemId });
      return descendants;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  const getAncestors = async (itemId: number) => {
    const operation = async () => {
      const ancestors = await utils.map.getAncestors.fetch({ itemId });
      return ancestors;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  return {
    getRootItemById,
    getDescendants,
    getAncestors,
  };
}