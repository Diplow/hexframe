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

export function handleToggleCompositionExpansion(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION }>,
): CacheState {
  const coordId = action.payload;
  const isExpanded = state.compositionExpandedIds.includes(coordId);
  const newCompositionExpandedIds = isExpanded
    ? state.compositionExpandedIds.filter((id) => id !== coordId)
    : [...state.compositionExpandedIds, coordId];

  return {
    ...state,
    compositionExpandedIds: newCompositionExpandedIds,
  };
}

export function handleSetCompositionExpansion(
  state: CacheState,
  action: Extract<CacheAction, { type: typeof ACTION_TYPES.SET_COMPOSITION_EXPANSION }>,
): CacheState {
  const { coordId, isExpanded } = action.payload;
  const currentlyExpanded = state.compositionExpandedIds.includes(coordId);

  if (isExpanded && !currentlyExpanded) {
    return {
      ...state,
      compositionExpandedIds: [...state.compositionExpandedIds, coordId],
    };
  } else if (!isExpanded && currentlyExpanded) {
    return {
      ...state,
      compositionExpandedIds: state.compositionExpandedIds.filter((id) => id !== coordId),
    };
  }

  return state;
}

export function handleClearCompositionExpansions(
  state: CacheState,
): CacheState {
  return {
    ...state,
    compositionExpandedIds: [],
  };
}
