import type { CacheState, RegionMetadata } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import { CoordSystem } from "~/lib/domains/mapping/utils";

// Basic state accessors - simple, direct property access
export const selectAllItems = (state: CacheState) => state.itemsById;

export const selectCurrentCenter = (state: CacheState): string | null => 
  state.currentCenter;

export const selectExpandedItemIds = (state: CacheState): string[] =>
  state.expandedItemIds;

export const selectIsLoading = (state: CacheState): boolean => state.isLoading;

export const selectError = (state: CacheState): Error | null => state.error;

export const selectLastUpdated = (state: CacheState): number =>
  state.lastUpdated;

// Configuration and metadata selectors
export const selectCacheConfig = (state: CacheState) => state.cacheConfig;

export const selectRegionMetadata = (state: CacheState) => state.regionMetadata;

export const selectCacheValidation = (state: CacheState) => ({
  hasValidCenter: state.currentCenter !== null,
  hasItems: Object.keys(state.itemsById).length > 0,
  isLoading: state.isLoading,
  hasError: state.error !== null,
  isStale: Date.now() - state.lastUpdated > state.cacheConfig.maxAge,
  lastUpdated: state.lastUpdated,
  config: state.cacheConfig,
});


