import type { CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";

// ============================================================================
// NAVIGATION ACTION CREATORS - Map navigation and expansion state
// ============================================================================

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

// ============================================================================
// VALIDATED NAVIGATION ACTION CREATORS - with runtime validation
// ============================================================================

export const createSetCenterAction = (centerCoordId: string): CacheAction => {
  if (!centerCoordId || centerCoordId.trim() === '') {
    throw new Error("Invalid centerCoordId for SET_CENTER action");
  }
  return {
    type: ACTION_TYPES.SET_CENTER,
    payload: centerCoordId,
  };
};
