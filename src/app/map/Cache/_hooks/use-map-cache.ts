import { useContext, useMemo, useCallback } from "react";
import { MapCacheContext } from "../provider";
import { cacheSelectors } from "../State/selectors";
import type { MapCacheHook } from "../types";

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

  // Memoized query operations
  const getRegionItems = useCallback(
    (centerCoordId: string, maxDepth?: number) => {
      return selectors.getRegionItems(centerCoordId, maxDepth);
    },
    [selectors],
  );

  const hasItem = useCallback(
    (coordId: string) => {
      return selectors.hasItem(coordId);
    },
    [selectors],
  );

  const isRegionLoaded = useCallback(
    (centerCoordId: string, maxDepth?: number) => {
      return selectors.isRegionLoaded(centerCoordId, maxDepth);
    },
    [selectors],
  );

  // Mutation operations with better naming for public API
  const createItemOptimistic = useCallback(
    async (coordId: string, data: {
      parentId?: number;
      title?: string;
      name?: string;
      description?: string;
      descr?: string;
      url?: string;
    }) => {
      await mutationOperations.createItem(coordId, data);
    },
    [mutationOperations],
  );

  const updateItemOptimistic = useCallback(
    async (coordId: string, data: {
      title?: string;
      name?: string;
      description?: string;
      descr?: string;
      url?: string;
    }) => {
      await mutationOperations.updateItem(coordId, data);
    },
    [mutationOperations],
  );

  const deleteItemOptimistic = useCallback(
    async (coordId: string) => {
      await mutationOperations.deleteItem(coordId);
    },
    [mutationOperations],
  );

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

  // Navigation operations
  const navigateToItem = useCallback(
    async (itemCoordId: string, options?: { pushToHistory?: boolean }) => {
      await navigationOperations.navigateToItem(itemCoordId, options);
    },
    [navigationOperations],
  );

  const updateCenter = useCallback(
    (centerCoordId: string) => {
      navigationOperations.updateCenter(centerCoordId);
    },
    [navigationOperations],
  );

  const prefetchForNavigation = useCallback(
    async (itemCoordId: string) => {
      await navigationOperations.prefetchForNavigation(itemCoordId);
    },
    [navigationOperations],
  );

  const toggleItemExpansionWithURL = useCallback(
    (itemId: string) => {
      navigationOperations.toggleItemExpansionWithURL(itemId);
    },
    [navigationOperations],
  );

  // Sync operations with clean interface
  const syncStatus = syncOperations.getSyncStatus();

  return {
    // State queries
    items: state.itemsById,
    center: state.currentCenter,
    expandedItems: state.expandedItemIds,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Query operations
    getRegionItems,
    hasItem,
    isRegionLoaded,

    // Data operations
    loadRegion: dataOperations.loadRegion,
    loadItemChildren: dataOperations.loadItemChildren,
    prefetchRegion: dataOperations.prefetchRegion,
    invalidateRegion: dataOperations.invalidateRegion,
    invalidateAll: dataOperations.invalidateAll,

    // Navigation operations
    navigateToItem,
    updateCenter,
    prefetchForNavigation,
    toggleItemExpansionWithURL,

    // Mutation operations (optimistic only)
    createItemOptimistic,
    updateItemOptimistic,
    deleteItemOptimistic,
    rollbackOptimisticChange: mutationOperations.rollbackOptimisticChange,
    rollbackAllOptimistic: mutationOperations.rollbackAllOptimistic,
    getPendingOptimisticChanges: mutationOperations.getPendingOptimisticChanges,

    // Sync operations
    sync: {
      isOnline: syncStatus.isOnline,
      lastSyncTime: syncStatus.lastSyncAt,
      performSync: syncOperations.performSync,
      forceSync: syncOperations.forceSync,
      pauseSync: syncOperations.pauseSync,
      resumeSync: syncOperations.resumeSync,
      getSyncStatus: syncOperations.getSyncStatus,
      serverService: context.serverService,
    },

    // Configuration
    config: state.cacheConfig,
    updateConfig,
  };
}