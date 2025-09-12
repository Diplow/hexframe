import type { CacheState } from "~/app/map/Cache/State/types";

// Simplified selectors factory 
export function cacheSelectors(state: CacheState) {
  return {
    // Basic accessors
    getAllItems: () => state.itemsById,
    getCenter: () => state.currentCenter,
    isLoading: () => state.isLoading,
    
    // Item accessors
    hasItem: (coordId: string) => !!state.itemsById[coordId],
    getItem: (coordId: string) => state.itemsById[coordId] ?? null,
  };
}

// Re-export static selectors from regions.ts
export { staticSelectors } from './regions';