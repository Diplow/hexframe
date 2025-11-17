import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import {
  handleLoadRegion,
  handleLoadItemChildren,
  handleUpdateItems,
  handleRemoveItem,
} from "~/app/map/Cache/State/_reducers/_data-reducers";
import {
  handleSetCenter,
  handleSetExpandedItems,
  handleToggleItemExpansion,
  handleToggleCompositionExpansion,
  handleSetCompositionExpansion,
} from "~/app/map/Cache/State/_reducers/_navigation-reducers";
import {
  handleSetLoading,
  handleSetError,
  handleInvalidateRegion,
  handleInvalidateAll,
  handleUpdateCacheConfig,
} from "~/app/map/Cache/State/_reducers/_system-reducers";

// Initial state for the cache
export const initialCacheState: CacheState = {
  itemsById: {},
  regionMetadata: {},
  currentCenter: null,
  expandedItemIds: [],
  isCompositionExpanded: false,
  isLoading: false,
  error: null,
  lastUpdated: 0,
  cacheConfig: {
    maxAge: 300000, // 5 minutes
    backgroundRefreshInterval: 30000, // 30 seconds
    enableOptimisticUpdates: true,
    maxDepth: 3, // Load center + 3 generations by default
  },
};

// Pure reducer function
export function cacheReducer(
  state: CacheState,
  action: CacheAction,
): CacheState {
  switch (action.type) {
    case ACTION_TYPES.LOAD_REGION:
      return handleLoadRegion(state, action);

    case ACTION_TYPES.LOAD_ITEM_CHILDREN:
      return handleLoadItemChildren(state, action);

    case ACTION_TYPES.SET_CENTER:
      return handleSetCenter(state, action);

    case ACTION_TYPES.SET_EXPANDED_ITEMS:
      return handleSetExpandedItems(state, action);

    case ACTION_TYPES.TOGGLE_ITEM_EXPANSION:
      return handleToggleItemExpansion(state, action);

    case ACTION_TYPES.TOGGLE_COMPOSITION_EXPANSION:
      return handleToggleCompositionExpansion(state, action);

    case ACTION_TYPES.SET_COMPOSITION_EXPANSION:
      return handleSetCompositionExpansion(state, action);

    case ACTION_TYPES.SET_LOADING:
      return handleSetLoading(state, action);

    case ACTION_TYPES.SET_ERROR:
      return handleSetError(state, action);

    case ACTION_TYPES.INVALIDATE_REGION:
      return handleInvalidateRegion(state, action);

    case ACTION_TYPES.INVALIDATE_ALL:
      return handleInvalidateAll(state);

    case ACTION_TYPES.UPDATE_CACHE_CONFIG:
      return handleUpdateCacheConfig(state, action);

    case ACTION_TYPES.REMOVE_ITEM:
      return handleRemoveItem(state, action);

    case ACTION_TYPES.UPDATE_ITEMS:
      return handleUpdateItems(state, action);

    default: {
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = action;
      void _exhaustiveCheck; // Intentional exhaustiveness check
      return state;
    }
  }
}
