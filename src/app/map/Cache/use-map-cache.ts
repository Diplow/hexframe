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
    pendingOperations: state.pendingOperations,
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

/**
 * Hook that returns only the center coordinate.
 *
 * NOTE: This does NOT prevent rerenders - components still rerender on every
 * MapCacheContext update. This is an organizational helper that provides
 * cleaner access to a single value.
 *
 * Validate actual render behavior with React DevTools Profiler.
 *
 * Phase 2: To prevent rerenders, use context splitting, use-context-selector,
 * or custom subscription pattern.
 */
export function useMapCacheCenter() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error("useMapCacheCenter must be used within a MapCacheProvider");
  }
  return context.state.currentCenter;
}

/**
 * Hook that returns only pending operations.
 *
 * NOTE: This does NOT prevent rerenders - components still rerender on every
 * MapCacheContext update. This is an organizational helper that provides
 * cleaner access to a single value.
 *
 * Validate actual render behavior with React DevTools Profiler.
 *
 * Phase 2: To prevent rerenders, use context splitting, use-context-selector,
 * or custom subscription pattern.
 */
export function useMapCachePendingOps() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error("useMapCachePendingOps must be used within a MapCacheProvider");
  }
  return context.state.pendingOperations;
}

/**
 * Hook that returns only query methods (getItem, hasItem, etc.).
 *
 * NOTE: This does NOT prevent rerenders - components still rerender on every
 * MapCacheContext update. This is an organizational helper that groups related
 * query methods together.
 *
 * Validate actual render behavior with React DevTools Profiler.
 *
 * Phase 2: To prevent rerenders, use context splitting, use-context-selector,
 * or custom subscription pattern.
 */
export function useMapCacheQuery() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error("useMapCacheQuery must be used within a MapCacheProvider");
  }
  const selectors = useMemo(() => cacheSelectors(context.state), [context.state]);
  return useMemo(() => createQueryCallbacks(selectors), [selectors]);
}

/**
 * Hook that returns only navigation methods (navigateToItem, updateCenter, etc.).
 *
 * NOTE: This does NOT prevent rerenders - components still rerender on every
 * MapCacheContext update. This is an organizational helper that groups related
 * navigation methods together.
 *
 * Validate actual render behavior with React DevTools Profiler.
 *
 * Phase 2: To prevent rerenders, use context splitting, use-context-selector,
 * or custom subscription pattern.
 */
export function useMapCacheNavigation() {
  const context = useContext(MapCacheContext);
  if (!context) {
    throw new Error("useMapCacheNavigation must be used within a MapCacheProvider");
  }
  return useMemo(
    () => createNavigationCallbacks(context.navigationOperations),
    [context.navigationOperations]
  );
}