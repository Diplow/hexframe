// Barrel export for State layer

// Types
export type {
  CacheState,
  CacheAction,
  RegionMetadata,
  LoadRegionPayload,
  LoadItemChildrenPayload,
  UpdateCacheConfigPayload,
} from "~/app/map/Cache/State/types";

export { ACTION_TYPES } from "~/app/map/Cache/State/types";

// Action creators
export {
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
  cacheActions,
} from "~/app/map/Cache/State/actions";

// Reducer and initial state
export { cacheReducer, initialCacheState } from "~/app/map/Cache/State/reducer";

// Selectors
export {
  selectItem,
  selectHasItem,
  selectItemsByIds,
  selectIsRegionLoaded,
  selectRegionHasDepth,
  selectShouldLoadRegion,
  selectRegionItems,
  selectRegionItemsOptimized,
  selectIsItemExpanded,
  selectExpandedItems,
  cacheSelectors,
} from "~/app/map/Cache/State/selectors";
