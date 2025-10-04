import type { ACTION_TYPES, CacheState, CacheAction } from "~/app/map/Cache/State/types";

export function handleSetCenter(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.SET_CENTER }>,
): CacheState {
  return {
    ...state,
    currentCenter: action.payload,
  };
}

export function handleSetExpandedItems(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS }>,
): CacheState {
  return {
    ...state,
    expandedItemIds: [...action.payload],
  };
}

export function handleToggleItemExpansion(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.TOGGLE_ITEM_EXPANSION }>,
): CacheState {
  const itemId = action.payload;
  const isExpanded = state.expandedItemIds.includes(itemId);
  const newExpandedItems = isExpanded
    ? state.expandedItemIds.filter((id) => id !== itemId)
    : [...state.expandedItemIds, itemId];

  return {
    ...state,
    expandedItemIds: newExpandedItems,
  };
}
