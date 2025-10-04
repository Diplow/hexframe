import type { MapItemAPIContract } from "~/server/api";
import type { TileData } from "~/app/map/types";
import type { CacheAction, LoadRegionPayload, LoadItemChildrenPayload } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";

// ============================================================================
// DATA ACTION CREATORS - Loading and updating map data
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

export const updateItems = (
  items: Record<string, TileData | undefined>,
): CacheAction => ({
  type: ACTION_TYPES.UPDATE_ITEMS,
  payload: items,
});

export const removeItem = (coordId: string): CacheAction => ({
  type: ACTION_TYPES.REMOVE_ITEM,
  payload: coordId,
});

// ============================================================================
// VALIDATED DATA ACTION CREATORS - with runtime validation
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
