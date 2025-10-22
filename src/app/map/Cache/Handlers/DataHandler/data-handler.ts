import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { LoadResult } from "~/app/map/Cache/types/handlers";
import { loggers } from "~/lib/debug/debug-logger";
import {
  fetchAndDispatchItems,
  shouldLoadRegion,
} from "~/app/map/Cache/Handlers/DataHandler/_helpers/data-handler-helpers";

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
      content: string;
      preview: string | undefined;
      link: string;
      parentId: string | null;
      itemType: string;
      ownerId: string;
    }[]>;
  };
}

export interface DataHandlerConfig {
  dispatch: Dispatch<CacheAction>;
  services: DataHandlerServices;
  getState: () => CacheState;
}

export function createDataHandler(config: DataHandlerConfig) {
  const { dispatch, services, getState } = config;

  const loadRegion = async (
    centerCoordId: string,
    maxDepth = getState().cacheConfig.maxDepth,
  ): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.loadRegion called`, { centerCoordId, maxDepth });

    if (!shouldLoadRegion(centerCoordId, maxDepth, getState)) {
      return { success: true, itemsLoaded: 0 };
    }

    return fetchAndDispatchItems(services, dispatch, {
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

    return fetchAndDispatchItems(services, dispatch, {
      centerCoordId: parentCoordId,
      maxDepth,
      actionType: 'loadItemChildren',
      showLoading: true,
    });
  };

  const prefetchRegion = async (centerCoordId: string): Promise<LoadResult> => {
    loggers.mapCache.handlers(`DataHandler.prefetchRegion called`, { centerCoordId });

    return fetchAndDispatchItems(services, dispatch, {
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

// Re-export factory functions
export {
  createDataHandlerWithServerService,
  createDataHandlerWithMockableService,
  createDataHandlerWithTRPC,
} from "~/app/map/Cache/Handlers/DataHandler/_factories/data-handler-factories";
