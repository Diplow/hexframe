import { type api } from "~/commons/trpc/react";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { CacheAction, CacheState } from "~/app/map/Cache/State/types";
import { cacheActions } from "~/app/map/Cache/State/actions";
import {
  createServerService,
  type useServerService,
} from "../Services/server-service";
import type { LoadResult } from "~/app/map/Cache/Handlers/types";
import { loggers } from "~/lib/debug/debug-logger";

export interface DataHandlerServices {
  server: {
    fetchItemsForCoordinate: (params: {
      centerCoordId: string;
      maxDepth: number;
    }) => Promise<{
      id: string;
      coordinates: string;
      depth: number;
      name: string;
      descr: string;
      url: string;
      parentId: string | null;
      itemType: string;
      ownerId: string;
    }[]>;
  };
}

export interface DataHandlerConfig {
  dispatch: React.Dispatch<CacheAction>;
  services: DataHandlerServices;
  getState: () => CacheState;
}

export function createDataHandler(config: DataHandlerConfig) {
  const { dispatch, services, getState } = config;

  const loadRegion = async (
    centerCoordId: string,
    maxDepth = getState().cacheConfig.maxDepth,
  ): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.loadRegion called`, {
      centerCoordId,
      maxDepth
    });
    const regionKey = centerCoordId;

    // Check if we need to load
    const regionMetadata = getState().regionMetadata[regionKey];
    const shouldLoad =
      !regionMetadata ||
      isStale(regionMetadata.loadedAt, getState().cacheConfig.maxAge) ||
      regionMetadata.maxDepth < maxDepth;

    if (!shouldLoad) {
      return { success: true, itemsLoaded: 0 };
    }

    dispatch(cacheActions.setLoading(true));

    try {
      // Load items relative to the specific coordinate, not from root
      const items = await services.server.fetchItemsForCoordinate({
        centerCoordId,
        maxDepth,
      });

      dispatch(cacheActions.loadRegion(items as Parameters<typeof cacheActions.loadRegion>[0], centerCoordId, maxDepth));

      return { success: true, itemsLoaded: items.length };
    } catch (error) {
      dispatch(cacheActions.setError(error as Error));
      return { success: false, error: error as Error, itemsLoaded: 0 };
    } finally {
      dispatch(cacheActions.setLoading(false));
    }
  };

  const loadItemChildren = async (
    parentCoordId: string,
    maxDepth = 2,
  ): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.loadItemChildren called`, {
      parentCoordId,
      maxDepth
    });
    dispatch(cacheActions.setLoading(true));

    try {
      // Load children relative to the specific parent coordinate
      const items = await services.server.fetchItemsForCoordinate({
        centerCoordId: parentCoordId,
        maxDepth,
      });

      dispatch(cacheActions.loadItemChildren(items as Parameters<typeof cacheActions.loadItemChildren>[0], parentCoordId, maxDepth));

      return { success: true, itemsLoaded: items.length };
    } catch (error) {
      dispatch(cacheActions.setError(error as Error));
      return { success: false, error: error as Error, itemsLoaded: 0 };
    } finally {
      dispatch(cacheActions.setLoading(false));
    }
  };

  const prefetchRegion = async (centerCoordId: string): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.prefetchRegion called`, {
      centerCoordId
    });
    // Prefetch without showing loading state
    try {
      const items = await services.server.fetchItemsForCoordinate({
        centerCoordId,
        maxDepth: getState().cacheConfig.maxDepth,
      });

      dispatch(
        cacheActions.loadRegion(
          items as Parameters<typeof cacheActions.loadRegion>[0],
          centerCoordId,
          getState().cacheConfig.maxDepth,
        ),
      );

      return { success: true, itemsLoaded: items.length };
    } catch (error) {
      // Silently fail for prefetch operations
      console.warn("Prefetch failed:", error);
      return { success: false, error: error as Error, itemsLoaded: 0 };
    }
  };

  const invalidateRegion = (regionKey: string) => {
    loggers.mapCache.handlers(`DataHandler.invalidateRegion called`, {
      regionKey
    });
    dispatch(cacheActions.invalidateRegion(regionKey));
  };

  const invalidateAll = () => {
    loggers.mapCache.handlers(`DataHandler.invalidateAll called`);
    dispatch(cacheActions.invalidateAll());
  };

  return {
    loadRegion,
    loadItemChildren,
    prefetchRegion,
    invalidateRegion,
    invalidateAll,
  };
}

// Helper function for cache staleness checking
function isStale(lastFetched: number, maxAge: number): boolean {
  return Date.now() - lastFetched > maxAge;
}

// Factory function for creating with server service
export function createDataHandlerWithServerService(
  dispatch: React.Dispatch<CacheAction>,
  getState: () => CacheState,
  serverService: ReturnType<typeof useServerService>,
) {
  const services: DataHandlerServices = {
    server: {
      fetchItemsForCoordinate: serverService.fetchItemsForCoordinate,
    },
  };

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

  const services: DataHandlerServices = {
    server: {
      fetchItemsForCoordinate: serverService.fetchItemsForCoordinate,
    },
  };

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
