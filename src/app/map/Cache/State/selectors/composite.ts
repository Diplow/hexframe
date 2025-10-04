import type { CacheState } from "~/app/map/Cache/State/types";
import { selectRegionItems, selectIsRegionLoaded } from "~/app/map/Cache/State/selectors/regions";

// Simplified selectors factory
export function cacheSelectors(state: CacheState) {
  return {
    // Item accessors - merged getItem with hasItem semantics (returns null if not found)
    getItemSafe: (coordId: string) => state.itemsById[coordId] ?? null,

    // Region accessors - delegate to imported selectors
    getRegionItems: (centerCoordId: string, maxDepth = 2) => selectRegionItems(state, centerCoordId, maxDepth),
    isRegionLoaded: (centerCoordId: string, maxAge?: number) => selectIsRegionLoaded(state, centerCoordId, maxAge),
  };
}

// Re-export static selectors from regions.ts
export { staticSelectors } from '~/app/map/Cache/State/selectors/regions';