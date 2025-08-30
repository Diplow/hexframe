// Barrel export for State layer

// Types
export type {
  CacheState,
  CacheAction,
  RegionMetadata,
  LoadRegionPayload,
  LoadItemChildrenPayload,
  UpdateCacheConfigPayload,
} from "./types";

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
  cacheActions,
  createLoadRegionAction,
  createLoadItemChildrenAction,
  createSetCenterAction,
  createOptimisticUpdateActions,
  createErrorHandlingActions,
  createBatchActions,
} from "./actions";

// Reducer and initial state
export { cacheReducer, initialCacheState } from "~/app/map/Cache/State/reducer";

// Selectors
export {
  selectAllItems,
  selectCurrentCenter,
  selectExpandedItemIds,
  selectIsLoading,
  selectError,
  selectLastUpdated,
  selectCacheConfig,
  selectRegionMetadata,
  selectItem,
  selectHasItem,
  selectItemsByIds,
  selectIsRegionLoaded,
  selectRegionHasDepth,
  selectShouldLoadRegion,
  selectRegionItems,
  selectRegionItemsOptimized,
  selectMaxLoadedDepth,
  selectCacheValidation,
  selectIsItemExpanded,
  selectExpandedItems,
  selectItemParent,
  selectItemChildren,
  cacheSelectors,
} from "./selectors";
