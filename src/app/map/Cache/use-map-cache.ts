"use client";

import { useContext, useMemo, useCallback } from "react";
import { MapCacheContext } from "~/app/map/Cache/provider";
import { cacheSelectors } from "~/app/map/Cache/State";
import type { MapCacheHook, DataOperations } from "~/app/map/Cache/types";
import type { CacheState } from "~/app/map/Cache/State";
import {
  createQueryCallbacks,
  createMutationCallbacks,
  createNavigationCallbacks,
  createHierarchyCallbacks,
  createSyncOperationsAPI,
} from "~/app/map/Cache/Lifecycle";
import { globalDragService } from "~/app/map/Services";

/**
 * Main hook that provides clean public API for cache operations
 */
export function useMapCache(): MapCacheHook {
  const context = useContext(MapCacheContext);

  if (!context) {
    throw new Error("useMapCache must be used within a MapCacheProvider");
  }

  const {
    state,
    dispatch,
    dataOperations,
    mutationOperations,
    navigationOperations,
    syncOperations,
  } = context;

  // Create selectors with current state
  const selectors = useMemo(() => cacheSelectors(state), [state]);

  // Extract callback creation
  const queryCallbacks = createQueryCallbacks(selectors);
  const mutationCallbacks = createMutationCallbacks(mutationOperations);
  const navigationCallbacks = createNavigationCallbacks(navigationOperations);
  const hierarchyCallbacks = createHierarchyCallbacks(state);
  const syncAPI = createSyncOperationsAPI(syncOperations, context.serverService);

  // Config updates
  const updateConfig = useCallback(
    (newConfig: Partial<MapCacheHook["config"]>) => {
      dispatch({
        type: "UPDATE_CACHE_CONFIG",
        payload: newConfig,
      });
    },
    [dispatch],
  );

  // Drag operations
  const startDrag = useCallback((tileId: string, event: globalThis.DragEvent) => {
    globalDragService.startDrag(tileId, event);
  }, []);

  return _buildPublicAPI({
    state,
    dataOperations,
    queryCallbacks,
    hierarchyCallbacks,
    navigationCallbacks,
    mutationCallbacks,
    syncAPI,
    updateConfig,
    startDrag,
  });
}


/**
 * Dependencies for building the public cache API
 */
interface CacheAPIDependencies {
  state: CacheState;
  dataOperations: DataOperations;
  queryCallbacks: ReturnType<typeof createQueryCallbacks>;
  hierarchyCallbacks: ReturnType<typeof createHierarchyCallbacks>;
  navigationCallbacks: ReturnType<typeof createNavigationCallbacks>;
  mutationCallbacks: ReturnType<typeof createMutationCallbacks>;
  syncAPI: ReturnType<typeof createSyncOperationsAPI>;
  updateConfig: (config: Partial<MapCacheHook["config"]>) => void;
  startDrag: (tileId: string, event: globalThis.DragEvent) => void;
}

/**
 * Build the public API object for the MapCache hook
 */
function _buildPublicAPI(deps: CacheAPIDependencies): MapCacheHook {
  const {
    state,
    dataOperations,
    queryCallbacks,
    hierarchyCallbacks,
    navigationCallbacks,
    mutationCallbacks,
    syncAPI,
    updateConfig,
    startDrag,
  } = deps;
  return {
    // State queries
    items: state.itemsById,
    center: state.currentCenter,
    expandedItems: state.expandedItemIds,
    isCompositionExpanded: state.isCompositionExpanded,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Query operations
    ...queryCallbacks,

    // Hierarchy operations
    ...hierarchyCallbacks,

    // Data operations
    loadRegion: dataOperations.loadRegion,
    loadItemChildren: dataOperations.loadItemChildren,
    prefetchRegion: dataOperations.prefetchRegion,
    invalidateRegion: dataOperations.invalidateRegion,
    invalidateAll: dataOperations.invalidateAll,

    // Navigation operations
    ...navigationCallbacks,

    // Mutation operations (optimistic only)
    ...mutationCallbacks,

    // Drag operations
    startDrag,

    // Sync operations
    sync: syncAPI,

    // Configuration
    config: state.cacheConfig,
    updateConfig,
  };
}