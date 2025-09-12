import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { TileData } from "~/app/map/types";
import type { CacheAction, LoadRegionPayload, LoadItemChildrenPayload, UpdateCacheConfigPayload } from "./types";
import { ACTION_TYPES } from "./types";

// ============================================================================
// BASIC ACTION CREATORS - pure functions that return action objects  
// ============================================================================

export const loadRegion = (
  items: MapItemAPIContract[],
  centerCoordId: string,
  maxDepth: number,
): CacheAction => ({
  type: ACTION_TYPES.LOAD_REGION,
  payload: {
    items,
    centerCoordId,
    maxDepth,
  },
});

export const loadItemChildren = (
  items: MapItemAPIContract[],
  parentCoordId: string,
  maxDepth: number,
): CacheAction => ({
  type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
  payload: {
    items,
    parentCoordId,
    maxDepth,
  },
});

export const setCenter = (centerCoordId: string | null): CacheAction => ({
  type: ACTION_TYPES.SET_CENTER,
  payload: centerCoordId,
});

export const setExpandedItems = (expandedItemIds: string[]): CacheAction => ({
  type: ACTION_TYPES.SET_EXPANDED_ITEMS,
  payload: expandedItemIds,
});

export const toggleItemExpansion = (itemId: string): CacheAction => ({
  type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
  payload: itemId,
});

export const setLoading = (loading: boolean): CacheAction => ({
  type: ACTION_TYPES.SET_LOADING,
  payload: loading,
});

export const setError = (error: Error | null): CacheAction => ({
  type: ACTION_TYPES.SET_ERROR,
  payload: error,
});

export const invalidateRegion = (regionKey: string): CacheAction => ({
  type: ACTION_TYPES.INVALIDATE_REGION,
  payload: regionKey,
});

export const invalidateAll = (): CacheAction => ({
  type: ACTION_TYPES.INVALIDATE_ALL,
});

export const removeItem = (coordId: string): CacheAction => ({
  type: ACTION_TYPES.REMOVE_ITEM,
  payload: coordId,
});

export const updateCacheConfig = (
  config: UpdateCacheConfigPayload,
): CacheAction => ({
  type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
  payload: config,
});

export const updateItems = (
  items: Record<string, TileData | undefined>,
): CacheAction => ({
  type: ACTION_TYPES.UPDATE_ITEMS,
  payload: items,
});

// ============================================================================
// VALIDATED ACTION CREATORS - with runtime validation
// ============================================================================

export const createLoadRegionAction = (payload: LoadRegionPayload): CacheAction => {
  if (!payload.centerCoordId || payload.centerCoordId.trim() === '' || payload.maxDepth < 0) {
    throw new Error("Invalid payload for LOAD_REGION action");
  }
  return {
    type: ACTION_TYPES.LOAD_REGION,
    payload,
  };
};

export const createLoadItemChildrenAction = (payload: LoadItemChildrenPayload): CacheAction => {
  if (!payload.parentCoordId || payload.parentCoordId.trim() === '') {
    throw new Error("Invalid payload for LOAD_ITEM_CHILDREN action");
  }
  return {
    type: ACTION_TYPES.LOAD_ITEM_CHILDREN,
    payload,
  };
};

export const createSetCenterAction = (centerCoordId: string): CacheAction => {
  if (!centerCoordId || centerCoordId.trim() === '') {
    throw new Error("Invalid centerCoordId for SET_CENTER action");
  }
  return {
    type: ACTION_TYPES.SET_CENTER,
    payload: centerCoordId,
  };
};

// ============================================================================
// HELPER ACTION CREATORS - combine multiple actions
// ============================================================================

export const createOptimisticUpdateActions = (
  centerCoordId: string,
  item: MapItemAPIContract,
): CacheAction[] => {
  return [
    loadRegion([item], centerCoordId, 1),
    setLoading(false),
  ];
};

export const createErrorHandlingActions = (error: Error): CacheAction[] => {
  return [
    setError(error),
    setLoading(false),
  ];
};

export const createBatchActions = (...actions: (CacheAction | null | undefined)[]): CacheAction[] => {
  return actions.filter((action): action is CacheAction => action != null);
};

// ============================================================================
// GROUPED ACTION CREATORS - for better organization
// ============================================================================

export const cacheActions = {
  loadRegion,
  loadItemChildren,
  setCenter,
  setExpandedItems,
  toggleItemExpansion,
  setLoading,
  setError,
  invalidateRegion,
  invalidateAll,
  updateCacheConfig,
  removeItem,
  updateItems,
};