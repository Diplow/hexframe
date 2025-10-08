import type { Dispatch } from "react";
import { type api } from "~/commons/trpc/react";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { loggers } from "~/lib/debug/debug-logger";
import { createDataHandler, type DataHandlerServices } from "~/app/map/Cache/Handlers/DataHandler/data-handler";

// Legacy factory function for backwards compatibility
// @deprecated Use createDataHandlerWithServerService instead
export function createDataHandlerWithTRPC(
  dispatch: Dispatch<CacheAction>,
  utils: ReturnType<typeof api.useUtils>,
  getState: () => CacheState,
) {
  loggers.mapCache.handlers(
    "createDataHandlerWithTRPC is deprecated. Use createDataHandlerWithServerService instead."
  );

  const services: DataHandlerServices = {
    server: {
      fetchItemsForCoordinate: async (params) => {
        // For now, we'll adapt the current API to work with coordinates
        // In the future, this should be a proper API that supports loading from any coordinate
        let coords;
        try {
          coords = CoordSystem.parseId(params.centerCoordId);
        } catch (error) {
          console.warn('[DataHandler] Invalid coordinate ID:', params.centerCoordId, error);
          // Return empty array for invalid coordinates
          return [];
        }

        // Don't make API calls with invalid userId/groupId values
        if (coords.userId === 0 || isNaN(coords.userId)) {
          console.warn('[DataHandler] Skipping API call due to invalid coordinate format:', {
            centerCoordId: params.centerCoordId,
            parsedCoords: coords,
            issue: isNaN(coords.userId) ? 'NaN userId (likely database ID passed instead of coordinate)' : 'Zero userId'
          });
          return [];
        }

        return utils.map.getItemsForRootItem.fetch({
          userId: coords.userId,
          groupId: coords.groupId,
          // TODO: Add centerCoordId and maxDepth parameters to the API
          // centerCoordId: params.centerCoordId,
          // maxDepth: params.maxDepth,
        });
      },
    },
  };

  return createDataHandler({ dispatch, services, getState });
}
