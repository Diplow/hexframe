import type { CacheState } from "./types";
import type { TileData } from "../../types/tile-data";
import { CoordSystem } from "~/lib/domains/mapping/interface";
import type { RegionMetadata } from "./types";

// Selector factory for creating memoized selectors
function createMemoizedSelector<TInput, TOutput>(
  selectorFn: (input: TInput) => TOutput,
  _isEqual: (a: TOutput, b: TOutput) => boolean = (a, b) => a === b,
) {
  let lastInput: TInput;
  let lastOutput: TOutput;
  let hasValue = false;

  return (input: TInput): TOutput => {
    if (!hasValue || input !== lastInput) {
      lastOutput = selectorFn(input);
      lastInput = input;
      hasValue = true;
    }
    return lastOutput;
  };
}

// Helper function to check if region metadata is stale
const isRegionStale = (metadata: RegionMetadata, maxAge: number): boolean => {
  return Date.now() - metadata.loadedAt > maxAge;
};

// Helper function to filter items within a region
const filterItemsInRegion = (
  items: Record<string, TileData>,
  centerCoordId: string,
  maxDepth: number,
): TileData[] => {
  const result: TileData[] = [];
  const centerCoords = CoordSystem.parseId(centerCoordId);

  // Add items within the specified depth from center
  for (const item of Object.values(items)) {
    const itemCoords = item.metadata.coordinates;

    // Check if item is within the specified region
    if (
      itemCoords.userId === centerCoords.userId &&
      itemCoords.groupId === centerCoords.groupId
    ) {
      // Calculate distance from center
      const relativePath = itemCoords.path.slice(centerCoords.path.length);
      const depth = relativePath.length;

      if (depth <= maxDepth) {
        result.push(item);
      }
    }
  }

  return result;
};

// Basic state selectors
export const selectAllItems = (
  state: CacheState,
): Record<string, TileData> => state.itemsById;

export const selectCurrentCenter = (state: CacheState): string | null =>
  state.currentCenter;

export const selectExpandedItemIds = (state: CacheState): string[] =>
  state.expandedItemIds;

export const selectIsLoading = (state: CacheState): boolean => state.isLoading;

export const selectError = (state: CacheState): Error | null => state.error;

export const selectLastUpdated = (state: CacheState): number =>
  state.lastUpdated;

export const selectCacheConfig = (state: CacheState) => state.cacheConfig;

export const selectRegionMetadata = (state: CacheState) => state.regionMetadata;

// Item lookup selectors
export const selectItem = (
  state: CacheState,
  coordId: string,
): TileData | undefined => state.itemsById[coordId];

export const selectHasItem = (state: CacheState, coordId: string): boolean =>
  !!state.itemsById[coordId];

export const selectItemsByIds = (
  state: CacheState,
  coordIds: string[],
): TileData[] =>
  coordIds
    .map((coordId) => state.itemsById[coordId])
    .filter((item): item is TileData => !!item);

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

// Memoized expensive selectors
export const selectRegionItems = createMemoizedSelector(
  ({
    state,
    centerCoordId,
    maxDepth,
  }: {
    state: CacheState;
    centerCoordId: string;
    maxDepth: number;
  }): TileData[] => {
    const regionItems: TileData[] = [];
    const centerItem = state.itemsById[centerCoordId];

    if (!centerItem) return regionItems;

    // Add center item
    regionItems.push(centerItem);

    // Get center coordinates for hierarchy calculation
    const centerCoords = centerItem.metadata.coordinates;
    const centerDepth = centerCoords.path.length;

    // Add items within the specified depth from center
    Object.values(state.itemsById).forEach((item) => {
      if (item.metadata.coordId === centerCoordId) return; // Skip center (already added)

      const itemCoords = item.metadata.coordinates;

      // Check if item belongs to the same coordinate tree
      if (
        itemCoords.userId !== centerCoords.userId ||
        itemCoords.groupId !== centerCoords.groupId
      ) {
        return;
      }

      // Calculate relative depth from center
      const itemDepth = itemCoords.path.length;
      const relativeDepth = itemDepth - centerDepth;

      // Include items within maxDepth generations from center
      if (relativeDepth > 0 && relativeDepth <= maxDepth) {
        // Check if item is descendant of center
        const isDescendant = centerCoords.path.every(
          (coord, index) => itemCoords.path[index] === coord,
        );

        if (isDescendant) {
          regionItems.push(item);
        }
      }
    });

    return regionItems;
  },
  // Custom equality check for memoization
  (a, b) =>
    a.length === b.length &&
    a.every((item, i) => item.metadata.coordId === b[i]?.metadata.coordId),
);

// Performance-optimized region filtering
const regionItemsCache = new Map<
  string,
  { items: TileData[]; checksum: string }
>();

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

  // Compute region items
  const items = selectRegionItems({ state, centerCoordId, maxDepth });

  // Update cache
  regionItemsCache.set(cacheKey, { items, checksum: itemsChecksum });

  // Cleanup old cache entries to prevent memory leaks
  if (regionItemsCache.size > 10) {
    const oldestKey = regionItemsCache.keys().next().value;
    if (oldestKey) {
      regionItemsCache.delete(oldestKey);
    }
  }

  return items;
};

// Derived state selectors
export const selectItemsByDepth = createMemoizedSelector(
  ({
    state,
    centerCoordId,
    targetDepth,
  }: {
    state: CacheState;
    centerCoordId: string;
    targetDepth: number;
  }): TileData[] => {
    const centerItem = state.itemsById[centerCoordId];
    if (!centerItem) return [];

    const centerDepth = centerItem.metadata.coordinates.path.length;
    const absoluteTargetDepth = centerDepth + targetDepth;

    return Object.values(state.itemsById).filter(
      (item) => item.metadata.coordinates.path.length === absoluteTargetDepth,
    );
  },
);

export const selectMaxLoadedDepth = (
  state: CacheState,
  centerCoordId: string,
): number => {
  const centerItem = state.itemsById[centerCoordId];
  if (!centerItem) return 0;

  const centerDepth = centerItem.metadata.coordinates.path.length;
  const centerCoords = centerItem.metadata.coordinates;

  let maxDepth = 0;
  Object.values(state.itemsById).forEach((item) => {
    const itemCoords = item.metadata.coordinates;

    // Check if item belongs to same coordinate tree and is descendant
    if (
      itemCoords.userId === centerCoords.userId &&
      itemCoords.groupId === centerCoords.groupId &&
      centerCoords.path.every((coord, i) => itemCoords.path[i] === coord)
    ) {
      const relativeDepth = itemCoords.path.length - centerDepth;
      if (relativeDepth > maxDepth) {
        maxDepth = relativeDepth;
      }
    }
  });

  return maxDepth;
};

// Validation utility selectors
export const selectCacheValidation = (state: CacheState) => ({
  hasItems: Object.keys(state.itemsById).length > 0,
  hasCenter: !!state.currentCenter,
  hasError: !!state.error,
  isStale:
    state.lastUpdated > 0 &&
    Date.now() - state.lastUpdated > state.cacheConfig.maxAge,
  loadedRegionsCount: Object.keys(state.regionMetadata).length,
});

// Expanded items utilities
export const selectIsItemExpanded = (
  state: CacheState,
  itemId: string,
): boolean => state.expandedItemIds.includes(itemId);

export const selectExpandedItems = (state: CacheState): TileData[] =>
  state.expandedItemIds
    .map((itemId) => {
      // Find item by database ID
      return Object.values(state.itemsById).find(
        (item) => item.metadata.dbId === itemId,
      );
    })
    .filter((item): item is TileData => !!item);

// Coordinate and hierarchy selectors
export const selectItemParent = (
  state: CacheState,
  coordId: string,
): TileData | null => {
  const item = state.itemsById[coordId];
  if (!item || item.metadata.coordinates.path.length <= 0) return null;

  const parentCoordId = CoordSystem.getParentCoordFromId(coordId);
  if (!parentCoordId) return null;

  return state.itemsById[parentCoordId] ?? null;
};

export const selectItemChildren = (
  state: CacheState,
  coordId: string,
): TileData[] => {
  const item = state.itemsById[coordId];
  if (!item) return [];

  const itemCoords = item.metadata.coordinates;

  return Object.values(state.itemsById).filter((candidateItem) => {
    const candidateCoords = candidateItem.metadata.coordinates;

    // Must be in same coordinate tree
    if (
      candidateCoords.userId !== itemCoords.userId ||
      candidateCoords.groupId !== itemCoords.groupId
    ) {
      return false;
    }

    // Must be direct child (one level deeper)
    if (candidateCoords.path.length !== itemCoords.path.length + 1) {
      return false;
    }

    // Must have item's path as prefix
    return itemCoords.path.every(
      (coord, i) => candidateCoords.path[i] === coord,
    );
  });
};

// Grouped selectors object for easy import
export const staticSelectors = {
  // Basic state
  allItems: selectAllItems,
  currentCenter: selectCurrentCenter,
  expandedItemIds: selectExpandedItemIds,
  isLoading: selectIsLoading,
  error: selectError,
  lastUpdated: selectLastUpdated,
  cacheConfig: selectCacheConfig,
  regionMetadata: selectRegionMetadata,

  // Item lookup
  item: selectItem,
  hasItem: selectHasItem,
  itemsByIds: selectItemsByIds,

  // Region validation
  isRegionLoaded: selectIsRegionLoaded,
  regionHasDepth: selectRegionHasDepth,
  shouldLoadRegion: selectShouldLoadRegion,

  // Memoized expensive operations
  regionItems: selectRegionItems,
  regionItemsOptimized: selectRegionItemsOptimized,
  itemsByDepth: selectItemsByDepth,
  maxLoadedDepth: selectMaxLoadedDepth,

  // Validation utilities
  cacheValidation: selectCacheValidation,

  // Expanded items
  isItemExpanded: selectIsItemExpanded,
  expandedItems: selectExpandedItems,

  // Hierarchy
  itemParent: selectItemParent,
  itemChildren: selectItemChildren,
};

// Selectors factory function - creates selectors bound to specific state
export function cacheSelectors(state: CacheState) {
  return {
    // Basic state selectors
    getAllItems: () => state.itemsById,

    getCenter: () => state.currentCenter,

    getExpandedItems: () => state.expandedItemIds,

    isLoading: () => state.isLoading,

    getError: () => state.error,

    getLastUpdated: () => state.lastUpdated,

    getConfig: () => state.cacheConfig,

    // Item-specific selectors
    hasItem: (coordId: string) => {
      return !!state.itemsById[coordId];
    },

    getItem: (coordId: string) => {
      return state.itemsById[coordId] ?? null;
    },

    getItemsByCoordIds: (coordIds: string[]) => {
      return coordIds
        .map((coordId) => state.itemsById[coordId])
        .filter(Boolean);
    },

    // Region-based selectors
    getRegionItems: (centerCoordId: string, maxDepth = 3) => {
      return filterItemsInRegion(state.itemsById, centerCoordId, maxDepth);
    },

    isRegionLoaded: (centerCoordId: string, maxDepth = 3) => {
      const regionKey = centerCoordId;
      const metadata = state.regionMetadata[regionKey];

      if (!metadata) return false;

      const isStale = isRegionStale(metadata, state.cacheConfig.maxAge);
      const hasEnoughDepth = metadata.maxDepth >= maxDepth;

      return !isStale && hasEnoughDepth;
    },

    getRegionMetadata: (centerCoordId: string) => {
      return state.regionMetadata[centerCoordId] ?? null;
    },

    getAllRegionMetadata: () => state.regionMetadata,

    // Hierarchical selectors
    getItemChildren: (parentCoordId: string) => {
      const children: TileData[] = [];
      const parentCoords = CoordSystem.parseId(parentCoordId);

      for (const item of Object.values(state.itemsById)) {
        const itemCoords = item.metadata.coordinates;

        // Check if this item is a direct child of the parent
        if (
          itemCoords.userId === parentCoords.userId &&
          itemCoords.groupId === parentCoords.groupId &&
          itemCoords.path.length === parentCoords.path.length + 1
        ) {
          // Check if the path prefix matches the parent
          const parentPathMatches = parentCoords.path.every(
            (coord, index) => itemCoords.path[index] === coord,
          );

          if (parentPathMatches) {
            children.push(item);
          }
        }
      }

      return children;
    },

    getItemParent: (coordId: string) => {
      const coords = CoordSystem.parseId(coordId);

      if (coords.path.length === 0) {
        return null; // Root item has no parent
      }

      const parentCoords = {
        userId: coords.userId,
        groupId: coords.groupId,
        path: coords.path.slice(0, -1),
      };

      const parentCoordId = CoordSystem.createId(parentCoords);
      return state.itemsById[parentCoordId] ?? null;
    },

    // Expanded state selectors
    isItemExpanded: (coordId: string) => {
      return state.expandedItemIds.includes(coordId);
    },

    getExpandedItemsData: () => {
      return state.expandedItemIds
        .map((coordId) => state.itemsById[coordId])
        .filter(Boolean);
    },

    // Search and filtering
    searchItems: (query: string) => {
      if (!query.trim()) return [];

      const lowerQuery = query.toLowerCase();
      return Object.values(state.itemsById).filter(
        (item) =>
          item.data.name?.toLowerCase().includes(lowerQuery) ||
          item.data.description?.toLowerCase().includes(lowerQuery),
      );
    },

    filterItemsByType: (_itemType: string) => {
      return Object.values(state.itemsById).filter(
        (item) => item.metadata.coordinates.path.length === 0, // Assuming type is determined by depth
      );
    },

    // Statistics and computed values
    getItemCount: () => {
      return Object.keys(state.itemsById).length;
    },

    getRegionCount: () => {
      return Object.keys(state.regionMetadata).length;
    },

    getLoadedRegionCount: () => {
      return Object.values(state.regionMetadata).filter(
        (metadata) => !isRegionStale(metadata, state.cacheConfig.maxAge),
      ).length;
    },

    getStaleRegionCount: () => {
      return Object.values(state.regionMetadata).filter((metadata) =>
        isRegionStale(metadata, state.cacheConfig.maxAge),
      ).length;
    },

    // Cache health indicators
    getCacheHealth: () => {
      const totalRegions = Object.keys(state.regionMetadata).length;
      const staleRegions = Object.values(state.regionMetadata).filter(
        (metadata) => isRegionStale(metadata, state.cacheConfig.maxAge),
      ).length;

      const healthScore =
        totalRegions > 0 ? (totalRegions - staleRegions) / totalRegions : 1;

      return {
        totalItems: Object.keys(state.itemsById).length,
        totalRegions,
        staleRegions,
        healthScore,
        lastUpdated: state.lastUpdated,
        hasErrors: !!state.error,
      };
    },

    // Memory usage estimation (approximate)
    getMemoryUsage: () => {
      const itemsSize = Object.keys(state.itemsById).length * 1024; // Rough estimate
      const metadataSize = Object.keys(state.regionMetadata).length * 256; // Rough estimate

      return {
        itemsSize,
        metadataSize,
        totalSize: itemsSize + metadataSize,
        itemCount: Object.keys(state.itemsById).length,
        regionCount: Object.keys(state.regionMetadata).length,
      };
    },

    // Debug selectors
    getStateSnapshot: () => ({
      itemCount: Object.keys(state.itemsById).length,
      regionCount: Object.keys(state.regionMetadata).length,
      center: state.currentCenter,
      expandedCount: state.expandedItemIds.length,
      isLoading: state.isLoading,
      hasError: !!state.error,
      config: state.cacheConfig,
      lastUpdated: state.lastUpdated,
    }),
  };
}

// Default selectors instance for backward compatibility
export const defaultSelectors = cacheSelectors({
  itemsById: {},
  regionMetadata: {},
  currentCenter: null,
  expandedItemIds: [],
  isLoading: false,
  error: null,
  lastUpdated: 0,
  cacheConfig: {
    maxAge: 300000,
    backgroundRefreshInterval: 30000,
    enableOptimisticUpdates: true,
    maxDepth: 3,
  },
});

// Export types for the selectors
export type CacheSelectors = ReturnType<typeof cacheSelectors>;
export type CacheSelectorFunction = typeof cacheSelectors;
