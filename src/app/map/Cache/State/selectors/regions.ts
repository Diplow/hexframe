import type { CacheState } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import { createMemoizedSelector } from "./items";

// Region validation selectors
export const selectIsRegionLoaded = (
  state: CacheState,
  centerCoordId: string,
  maxAge?: number,
): boolean => {
  const region = state.regionMetadata[centerCoordId];
  if (!region) return false;

  const ageLimit = maxAge ?? state.cacheConfig.maxAge;
  const isStale = Date.now() - region.loadedAt > ageLimit;
  return !isStale;
};

export const selectRegionHasDepth = (
  state: CacheState,
  centerCoordId: string,
  requiredDepth: number,
): boolean => {
  const region = state.regionMetadata[centerCoordId];
  return region ? region.maxDepth >= requiredDepth : false;
};

export const selectShouldLoadRegion = (
  state: CacheState,
  centerCoordId: string,
  requiredDepth: number,
): boolean => {
  const isLoaded = selectIsRegionLoaded(state, centerCoordId);
  const hasDepth = selectRegionHasDepth(state, centerCoordId, requiredDepth);
  return !isLoaded || !hasDepth;
};

// Performance-optimized region filtering
const regionItemsCache = new Map<
  string,
  { items: TileData[]; checksum: string }
>();

export const selectRegionItems = (
  state: CacheState,
  centerCoordId: string,
  maxDepth: number,
): TileData[] => {
  return selectRegionItemsOptimized(state, centerCoordId, maxDepth);
};

export const selectRegionItemsOptimized = (
  state: CacheState,
  centerCoordId: string,
  maxDepth: number,
): TileData[] => {
  // Create cache key and checksum
  const cacheKey = `${centerCoordId}:${maxDepth}`;
  const itemsChecksum = `${Object.keys(state.itemsById).sort().join("|")}:${state.lastUpdated}`;

  // Check cache
  const cached = regionItemsCache.get(cacheKey);
  if (cached && cached.checksum === itemsChecksum) {
    return cached.items;
  }

  // Compute region items using basic selection logic
  const regionItems: TileData[] = [];
  const centerItem = state.itemsById[centerCoordId];

  if (centerItem) {
    regionItems.push(centerItem);
    
    const centerCoords = centerItem.metadata.coordinates;
    const centerDepth = centerCoords.path.length;

    Object.values(state.itemsById).forEach((item) => {
      if (item.metadata.coordId === centerCoordId) return;
      
      const itemCoords = item.metadata.coordinates;
      const itemDepth = itemCoords.path.length;
      
      if (itemCoords.userId === centerCoords.userId && 
          itemCoords.groupId === centerCoords.groupId) {
        const relativeDepth = itemDepth - centerDepth;
        if (relativeDepth > 0 && relativeDepth <= maxDepth) {
          regionItems.push(item);
        }
      }
    });
  }

  // Update cache
  regionItemsCache.set(cacheKey, { items: regionItems, checksum: itemsChecksum });

  // Cleanup old cache entries to prevent memory leaks
  if (regionItemsCache.size > 10) {
    const oldestKey = regionItemsCache.keys().next().value;
    if (oldestKey) {
      regionItemsCache.delete(oldestKey);
    }
  }

  return regionItems;
};

// Static grouped selectors for easy import - essential selectors only
export const staticSelectors = {
  // Core state
  allItems: (state: CacheState) => state.itemsById,
  currentCenter: (state: CacheState) => state.currentCenter,
  isLoading: (state: CacheState) => state.isLoading,
  error: (state: CacheState) => state.error,

  // Essential item operations  
  hasItem: (state: CacheState, coordId: string) => !!state.itemsById[coordId],
  getItem: (state: CacheState, coordId: string) => state.itemsById[coordId] ?? null,
  
  // Region operations
  regionItems: (state: CacheState, centerCoordId: string, maxDepth = 2) => 
    selectRegionItems(state, centerCoordId, maxDepth),
};