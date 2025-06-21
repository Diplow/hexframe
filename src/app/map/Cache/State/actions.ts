import type {
  CacheAction,
  LoadRegionPayload,
  LoadItemChildrenPayload,
  UpdateCacheConfigPayload,
} from "./types";
import { ACTION_TYPES } from "./types";
import type { MapItemAPIContract } from "~/server/api/types/contracts";
import type { TileData } from "../../types/tile-data";

// Action creators - pure functions that return action objects

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

export const setCenter = (centerCoordId: string): CacheAction => ({
  type: ACTION_TYPES.SET_CENTER,
  payload: centerCoordId,
});

export const setExpandedItems = (itemIds: string[]): CacheAction => ({
  type: ACTION_TYPES.SET_EXPANDED_ITEMS,
  payload: itemIds,
});

export const toggleItemExpansion = (itemId: string): CacheAction => ({
  type: ACTION_TYPES.TOGGLE_ITEM_EXPANSION,
  payload: itemId,
});

export const setLoading = (isLoading: boolean): CacheAction => ({
  type: ACTION_TYPES.SET_LOADING,
  payload: isLoading,
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

export const updateCacheConfig = (
  config: UpdateCacheConfigPayload,
): CacheAction => ({
  type: ACTION_TYPES.UPDATE_CACHE_CONFIG,
  payload: config,
});

export const removeItem = (coordId: string): CacheAction => ({
  type: ACTION_TYPES.REMOVE_ITEM,
  payload: coordId,
});

export const updateItems = (items: Record<string, TileData | undefined>): CacheAction => ({
  type: ACTION_TYPES.UPDATE_ITEMS,
  payload: items,
});

// Grouped action creators for better organization
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

// Type-safe action creators with payload validation
export const createLoadRegionAction = (
  payload: LoadRegionPayload,
): CacheAction => {
  if (!payload.centerCoordId || payload.maxDepth < 0) {
    throw new Error("Invalid payload for LOAD_REGION action");
  }
  return loadRegion(payload.items, payload.centerCoordId, payload.maxDepth);
};

export const createLoadItemChildrenAction = (
  payload: LoadItemChildrenPayload,
): CacheAction => {
  if (!payload.parentCoordId || payload.maxDepth < 0) {
    throw new Error("Invalid payload for LOAD_ITEM_CHILDREN action");
  }
  return loadItemChildren(
    payload.items,
    payload.parentCoordId,
    payload.maxDepth,
  );
};

export const createSetCenterAction = (centerCoordId: string): CacheAction => {
  if (!centerCoordId || centerCoordId.trim() === "") {
    throw new Error("Invalid centerCoordId for SET_CENTER action");
  }
  return setCenter(centerCoordId);
};

// Helper functions for complex action creation
export const createOptimisticUpdateActions = (
  targetCoordId: string,
  tempItem: MapItemAPIContract,
): CacheAction[] => {
  return [loadRegion([tempItem], targetCoordId, 1), setLoading(false)];
};

export const createErrorHandlingActions = (error: Error): CacheAction[] => {
  return [setError(error), setLoading(false)];
};

// Batch action creator for atomic operations
export const createBatchActions = (
  ...actions: CacheAction[]
): CacheAction[] => {
  return actions.filter((action) => action !== null && action !== undefined);
};
