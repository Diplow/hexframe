import type { api } from "~/commons/trpc/react";
import type { ServiceConfig } from "~/app/map/Cache/Services";
import { _wrapOperation } from "~/app/map/Cache/Services/server/_internals/_operation-wrapper";

/**
 * Create item-based query operations
 */
export function createItemOperations(
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) {
  const getRootItemById = async (mapItemId: number) => {
    return _wrapOperation(
      () => utils.map.getRootItemById.fetch({ mapItemId }),
      finalConfig
    );
  };

  const getDescendants = async (itemId: number) => {
    return _wrapOperation(
      () => utils.map.getDescendants.fetch({ itemId }),
      finalConfig
    );
  };

  const getAncestors = async (itemId: number) => {
    return _wrapOperation(
      () => utils.map.getAncestors.fetch({ itemId }),
      finalConfig
    );
  };

  return {
    getRootItemById,
    getDescendants,
    getAncestors,
  };
}