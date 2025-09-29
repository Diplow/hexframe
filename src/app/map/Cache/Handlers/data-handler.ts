import { type api } from "~/commons/trpc/react";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State/actions";
import {
  createServerService,
  type useServerService,
} from "~/app/map/Cache/Services/server/server-service";
import type { LoadResult } from "~/app/map/Cache/types/handlers";
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
      title: string;
      descr: string;
      preview: string | undefined;
      link: string;
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

// Helper function to fetch and dispatch items
interface FetchAndDispatchOptions {
  centerCoordId: string;
  maxDepth: number;
  actionType: 'loadRegion' | 'loadItemChildren' | 'Prefetch';
  showLoading: boolean;
  silentFail?: boolean;
}

async function _fetchAndDispatchItems(
  services: DataHandlerServices,
  dispatch: React.Dispatch<CacheAction>,
  options: FetchAndDispatchOptions
): Promise<LoadResult> {
  const { centerCoordId, maxDepth, actionType, showLoading, silentFail } = options;

  if (showLoading) {
    dispatch(cacheActions.setLoading(true));
  }

  try {
    const items = await services.server.fetchItemsForCoordinate({ centerCoordId, maxDepth });

    if (actionType === 'loadRegion' || actionType === 'Prefetch') {
      dispatch(cacheActions.loadRegion(
        items as Parameters<typeof cacheActions.loadRegion>[0],
        centerCoordId,
        maxDepth
      ));
    } else {
      dispatch(cacheActions.loadItemChildren(
        items as Parameters<typeof cacheActions.loadItemChildren>[0],
        centerCoordId,
        maxDepth
      ));
    }

    return { success: true, itemsLoaded: items.length };
  } catch (error) {
    const errorObj = error as Error;

    if (silentFail) {
      console.warn(`${actionType} failed:`, error);
    } else {
      dispatch(cacheActions.setError(errorObj));
    }

    return { success: false, error: errorObj, itemsLoaded: 0 };
  } finally {
    if (showLoading) {
      dispatch(cacheActions.setLoading(false));
    }
  }
}

function _shouldLoadRegion(
  regionKey: string,
  maxDepth: number,
  getState: () => CacheState
): boolean {
  const regionMetadata = getState().regionMetadata[regionKey];
  return (
    !regionMetadata ||
    isStale(regionMetadata.loadedAt, getState().cacheConfig.maxAge) ||
    regionMetadata.maxDepth < maxDepth
  );
}

export function createDataHandler(config: DataHandlerConfig) {
  const { dispatch, services, getState } = config;

  const loadRegion = async (
    centerCoordId: string,
    maxDepth = getState().cacheConfig.maxDepth,
  ): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.loadRegion called`, { centerCoordId, maxDepth });

    if (!_shouldLoadRegion(centerCoordId, maxDepth, getState)) {
      return { success: true, itemsLoaded: 0 };
    }

    return _fetchAndDispatchItems(services, dispatch, {
      centerCoordId,
      maxDepth,
      actionType: 'loadRegion',
      showLoading: true,
    });
  };

  const loadItemChildren = async (
    parentCoordId: string,
    maxDepth = 2,
  ): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.loadItemChildren called`, { parentCoordId, maxDepth });

    return _fetchAndDispatchItems(services, dispatch, {
      centerCoordId: parentCoordId,
      maxDepth,
      actionType: 'loadItemChildren',
      showLoading: true,
    });
  };

  const prefetchRegion = async (centerCoordId: string): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.prefetchRegion called`, { centerCoordId });

    return _fetchAndDispatchItems(services, dispatch, {
      centerCoordId,
      maxDepth: getState().cacheConfig.maxDepth,
      actionType: 'Prefetch',
      showLoading: false,
      silentFail: true,
    });
  };

  const invalidateRegion = (regionKey: string) => {
    loggers.mapCache.handlers(`DataHandler.invalidateRegion called`, { regionKey });
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
