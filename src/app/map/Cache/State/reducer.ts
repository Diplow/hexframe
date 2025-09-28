import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import { ACTION_TYPES } from "~/app/map/Cache/State/types";
import type { TileData } from "~/app/map/types";
import type { MapItemAPIContract } from "~/server/api";
import { adapt } from "~/app/map/types";

// Initial state for the cache
export const initialCacheState: CacheState = {
  itemsById: {},
  regionMetadata: {},
  currentCenter: null,
  expandedItemIds: [],
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

// Pure helper functions for reducer logic
const formatItems = (items: MapItemAPIContract[]): TileData[] => {
  return items
    .map((item) => {
      try {
        return adapt(item);
      } catch {
        // Skip items that can't be adapted (malformed coordinates, etc.)
        return null;
      }
    })
    .filter((item): item is TileData => {
      if (!item) return false;
      // Filter out items with zero in path
      return !item.metadata.coordinates.path.includes(0);
    });
};

const createRegionKey = (centerCoordId: string): string => {
  // Simple region key creation - can be enhanced later
  return centerCoordId;
};

const hasDataChanges = (
  oldItems: Record<string, TileData>,
  newItems: Record<string, TileData>,
): boolean => {
  const newKeys = Object.keys(newItems);

  for (const key of newKeys) {
    const oldItem = oldItems[key];
    const newItem = newItems[key];

    if (
      !oldItem ||
      oldItem.data.name !== newItem?.data.name ||
      oldItem.data.description !== newItem?.data.description
    ) {
      return true;
    }
  }

  return false;
};

// Pure reducer function
export function cacheReducer(
  state: CacheState,
  action: CacheAction,
): CacheState {
  switch (action.type) {
    case ACTION_TYPES.LOAD_REGION: {
      const { items, centerCoordId, maxDepth } = action.payload;
      
      // LOAD_REGION action
      
      const newItems = formatItems(items);
      const regionKey = createRegionKey(centerCoordId);

      // Create new items map without mutation
      const updatedItems = { ...state.itemsById };
      newItems.forEach((item) => {
        updatedItems[item.metadata.coordId] = item;
      });

      // Create new region metadata
      const newRegionMetadata = {
        ...state.regionMetadata,
        [regionKey]: {
          centerCoordId,
          maxDepth,
          loadedAt: Date.now(),
          itemCoordIds: newItems.map((item) => item.metadata.coordId),
        },
      };

      // LOAD_REGION processing complete

      const newState = {
        ...state,
        itemsById: updatedItems,
        regionMetadata: newRegionMetadata,
        lastUpdated: Date.now(),
        error: null,
      };
      
      // State updated with new items
      
      return newState;
    }

    case ACTION_TYPES.LOAD_ITEM_CHILDREN: {
      const { items } = action.payload;
      const newItems = formatItems(items);

      // Check for changes to prevent unnecessary updates
      const newItemsById = newItems.reduce(
        (acc, item) => {
          acc[item.metadata.coordId] = item;
          return acc;
        },
        {} as Record<string, TileData>,
      );

      const hasChanges = hasDataChanges(state.itemsById, newItemsById);
      if (!hasChanges) {
        return state;
      }

      // Create updated items without mutation
      const updatedItems = { ...state.itemsById };
      newItems.forEach((item) => {
        updatedItems[item.metadata.coordId] = item;
      });

      return {
        ...state,
        itemsById: updatedItems,
        lastUpdated: Date.now(),
      };
    }

    case ACTION_TYPES.SET_CENTER: {
      return {
        ...state,
        currentCenter: action.payload,
      };
    }

    case ACTION_TYPES.SET_EXPANDED_ITEMS: {
      return {
        ...state,
        expandedItemIds: [...action.payload], // Create new array
      };
    }

    case ACTION_TYPES.TOGGLE_ITEM_EXPANSION: {
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

    case ACTION_TYPES.SET_LOADING: {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case ACTION_TYPES.SET_ERROR: {
      return {
        ...state,
        error: action.payload,
      };
    }

    case ACTION_TYPES.INVALIDATE_REGION: {
      const regionKey = action.payload;
      const newRegionMetadata = { ...state.regionMetadata };
      delete newRegionMetadata[regionKey];

      return {
        ...state,
        regionMetadata: newRegionMetadata,
      };
    }

    case ACTION_TYPES.INVALIDATE_ALL: {
      console.error('[DEBUG Reducer] INVALIDATE_ALL called! This clears all items!');
      return {
        ...state,
        itemsById: {},
        regionMetadata: {},
        lastUpdated: 0,
      };
    }

    case ACTION_TYPES.UPDATE_CACHE_CONFIG: {
      return {
        ...state,
        cacheConfig: {
          ...state.cacheConfig,
          ...action.payload,
        },
      };
    }

    case ACTION_TYPES.REMOVE_ITEM: {
      const coordId = action.payload;
      const newItemsById = { ...state.itemsById };
      delete newItemsById[coordId];
      
      // Also update region metadata to remove this item from any regions
      const newRegionMetadata = { ...state.regionMetadata };
      Object.keys(newRegionMetadata).forEach(regionKey => {
        const region = newRegionMetadata[regionKey];
        if (region) {
          region.itemCoordIds = region.itemCoordIds.filter(id => id !== coordId);
        }
      });
      
      return {
        ...state,
        itemsById: newItemsById,
        regionMetadata: newRegionMetadata,
        lastUpdated: Date.now(),
      };
    }

    case ACTION_TYPES.UPDATE_ITEMS: {
      const updates = action.payload;
      const newItemsById = { ...state.itemsById };
      const deletedCoordIds: string[] = [];
      
      Object.entries(updates).forEach(([coordId, item]) => {
        if (item === undefined) {
          delete newItemsById[coordId];
          deletedCoordIds.push(coordId);
        } else {
          newItemsById[coordId] = item;
        }
      });
      
      // Update region metadata to remove deleted items
      let newRegionMetadata = state.regionMetadata;
      if (deletedCoordIds.length > 0) {
        newRegionMetadata = { ...state.regionMetadata };
        Object.keys(newRegionMetadata).forEach(regionKey => {
          const region = newRegionMetadata[regionKey];
          if (region) {
            const filteredCoordIds = region.itemCoordIds.filter(
              id => !deletedCoordIds.includes(id)
            );
            if (filteredCoordIds.length !== region.itemCoordIds.length) {
              newRegionMetadata[regionKey] = {
                ...region,
                itemCoordIds: filteredCoordIds,
              };
            }
          }
        });
      }
      
      return {
        ...state,
        itemsById: newItemsById,
        regionMetadata: newRegionMetadata,
        lastUpdated: Date.now(),
      };
    }

    default: {
      // TypeScript exhaustiveness check
      const _exhaustiveCheck: never = action;
      void _exhaustiveCheck; // Intentional exhaustiveness check
      return state;
    }
  }
}
