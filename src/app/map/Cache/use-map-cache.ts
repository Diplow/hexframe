import { useContext, useMemo, useCallback } from "react";
import { MapCacheContext } from "./provider";
import { cacheSelectors } from "./State/selectors";
import type { MapCacheHook } from "./types";
import type { TileData } from "~/app/map/types/tile-data";
import * as hierarchyService from "./Services/hierarchy-service";

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
  const getItem = useCallback(
    (coordId: string) => {
      return selectors.getItem(coordId);
    },
    [selectors],
  );

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
      // deleteItemOptimistic called
      await mutationOperations.deleteItem(coordId);
      // deleteItemOptimistic completed
    },
    [mutationOperations],
  );

  const moveItemOptimistic = useCallback(
    async (sourceCoordId: string, targetCoordId: string) => {
      const result = await mutationOperations.moveItem(sourceCoordId, targetCoordId);
      return result;
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

  // Helper function to convert coordinate ID to database ID
  const getDbIdFromCoordId = useCallback((coordId: string): string | null => {
    const item = state.itemsById[coordId];
    return item ? item.metadata.dbId.toString() : null;
  }, [state.itemsById]);

  // Navigation operations - now converts coordinate IDs to database IDs
  const navigateToItem = useCallback(
    async (itemIdentifier: string, options?: { pushToHistory?: boolean }) => {
      // Navigate request for identifier
      
      let dbId: string;
      
      // Check if it's already a database ID (pure number) or coordinate ID
      if (/^\d+$/.test(itemIdentifier)) {
        // It's already a database ID
        dbId = itemIdentifier;
        // Using provided database ID
      } else {
        // It's a coordinate ID, convert to database ID
        const resolvedDbId = getDbIdFromCoordId(itemIdentifier);
        if (!resolvedDbId) {
          // Cannot find database ID for coordinate
          throw new Error(`No item found with coordinate ID: ${itemIdentifier}`);
        }
        dbId = resolvedDbId;
        // Converted coordinate ID to database ID
      }
      
      await navigationOperations.navigateToItem(dbId, options);
    },
    [navigationOperations, getDbIdFromCoordId],
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

  // Hierarchy operations
  const getParentHierarchy = useCallback(
    (centerCoordId?: string) => {
      const effectiveCenter = centerCoordId ?? state.currentCenter;
      if (!effectiveCenter) return [];
      return hierarchyService.getParentHierarchy(effectiveCenter, state.itemsById);
    },
    [state.currentCenter, state.itemsById],
  );

  const getCenterItem = useCallback(
    (centerCoordId?: string) => {
      const effectiveCenter = centerCoordId ?? state.currentCenter;
      if (!effectiveCenter) return null;
      return hierarchyService.getCenterItem(effectiveCenter, state.itemsById);
    },
    [state.currentCenter, state.itemsById],
  );

  const isUserMapCenter = useCallback(
    (item: TileData) => {
      return hierarchyService.isUserMapCenter(item);
    },
    [],
  );

  const shouldShowHierarchy = useCallback(
    (hierarchy: TileData[], currentCenter?: string) => {
      return hierarchyService.shouldShowHierarchy(
        hierarchy, 
        currentCenter ?? state.currentCenter ?? undefined
      );
    },
    [state.currentCenter],
  );

  return {
    // State queries
    items: state.itemsById,
    center: state.currentCenter,
    expandedItems: state.expandedItemIds,
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Query operations
    getItem,
    getRegionItems,
    hasItem,
    isRegionLoaded,

    // Hierarchy operations
    getParentHierarchy,
    getCenterItem,
    isUserMapCenter,
    shouldShowHierarchy,

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
    moveItemOptimistic,
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