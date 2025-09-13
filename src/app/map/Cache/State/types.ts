import type { TileData } from "~/app/map/types";
import type { MapItemAPIContract } from "~/server/api";

// Region metadata interface for hierarchical loading
export interface RegionMetadata {
  centerCoordId: string; // Focal point that was loaded
  maxDepth: number; // Maximum depth loaded from this center
  loadedAt: number; // When this region was loaded
  itemCoordIds: string[]; // Which items were loaded
}

// Cache state interface
export interface CacheState {
  // Item-based cache - no duplication
  itemsById: Record<string, TileData>; // Key: coordId

  // Region metadata for hierarchical loading
  regionMetadata: Record<string, RegionMetadata>; // Key: "userId,groupId:centerPath"

  // Current center for dynamic navigation
  currentCenter: string | null;
  expandedItemIds: string[];

  // Error handling and loading states
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;

  // Cache configuration
  cacheConfig: {
    maxAge: number;
    backgroundRefreshInterval: number;
    enableOptimisticUpdates: boolean;
    maxDepth: number;
  };
}

// Action payload types for better type safety
export interface LoadRegionPayload {
  items: MapItemAPIContract[];
  centerCoordId: string;
  maxDepth: number;
}

export interface LoadItemChildrenPayload {
  items: MapItemAPIContract[];
  parentCoordId: string;
  maxDepth: number;
}

export interface UpdateCacheConfigPayload {
  maxAge?: number;
  backgroundRefreshInterval?: number;
  enableOptimisticUpdates?: boolean;
  maxDepth?: number;
}

// Action constants for better type safety and IDE support
export const ACTION_TYPES = {
  LOAD_REGION: "LOAD_REGION",
  LOAD_ITEM_CHILDREN: "LOAD_ITEM_CHILDREN",
  SET_CENTER: "SET_CENTER",
  SET_EXPANDED_ITEMS: "SET_EXPANDED_ITEMS",
  TOGGLE_ITEM_EXPANSION: "TOGGLE_ITEM_EXPANSION",
  SET_LOADING: "SET_LOADING",
  SET_ERROR: "SET_ERROR",
  INVALIDATE_REGION: "INVALIDATE_REGION",
  INVALIDATE_ALL: "INVALIDATE_ALL",
  UPDATE_CACHE_CONFIG: "UPDATE_CACHE_CONFIG",
  REMOVE_ITEM: "REMOVE_ITEM",
  UPDATE_ITEMS: "UPDATE_ITEMS",
} as const;

// Action types using ACTION_TYPES constants for better type safety
export type CacheAction =
  | {
      type: typeof ACTION_TYPES.LOAD_REGION;
      payload: LoadRegionPayload;
    }
  | {
      type: typeof ACTION_TYPES.LOAD_ITEM_CHILDREN;
      payload: LoadItemChildrenPayload;
    }
  | { type: typeof ACTION_TYPES.SET_CENTER; payload: string | null }
  | { type: typeof ACTION_TYPES.SET_EXPANDED_ITEMS; payload: string[] }
  | { type: typeof ACTION_TYPES.TOGGLE_ITEM_EXPANSION; payload: string }
  | { type: typeof ACTION_TYPES.SET_LOADING; payload: boolean }
  | { type: typeof ACTION_TYPES.SET_ERROR; payload: Error | null }
  | { type: typeof ACTION_TYPES.INVALIDATE_REGION; payload: string }
  | { type: typeof ACTION_TYPES.INVALIDATE_ALL }
  | {
      type: typeof ACTION_TYPES.UPDATE_CACHE_CONFIG;
      payload: UpdateCacheConfigPayload;
    }
  | { type: typeof ACTION_TYPES.REMOVE_ITEM; payload: string }
  | { 
      type: typeof ACTION_TYPES.UPDATE_ITEMS; 
      payload: Record<string, TileData | undefined>;
    };

// Action creators moved to actions.ts for better separation of concerns
