import { type api } from "~/commons/trpc/react";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import {
  createServerService,
  type useServerService,
} from "~/app/map/Cache/Services";
import { loggers } from "~/lib/debug/debug-logger";
import { createDataHandler, type DataHandlerServices } from "~/app/map/Cache/Handlers/DataHandler/data-handler";

// Shared helper to create services object
function _createServicesFromServerService(serverService: ReturnType<typeof useServerService>): DataHandlerServices {
  return {
    server: {
      fetchItemsForCoordinate: serverService.fetchItemsForCoordinate,
    },
  };
}

// Factory function for creating with server service
export function createDataHandlerWithServerService(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  serverService: ReturnType<typeof useServerService>,
) {
  const services = _createServicesFromServerService(serverService);
  return createDataHandler({ dispatch, services, getState });
}

// Pure factory function for easier testing
export function createDataHandlerWithMockableService(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  utils: ReturnType<typeof api.useUtils>,
  serviceConfig?: Parameters<typeof createServerService>[1],
) {
  const serverService = createServerService(utils, serviceConfig);
  const services = _createServicesFromServerService(serverService);
  return createDataHandler({ dispatch, services, getState });
}

// Legacy factory function for backwards compatibility
// @deprecated Use createDataHandlerWithServerService instead
export function createDataHandlerWithTRPC(
  dispatch: React.Dispatch<CacheAction>,
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
