import type { Dispatch } from "react";
import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { MapItemUpdateAttributes, MapItemCreateAttributes } from "~/lib/domains/mapping/utils";

// Common handler dependencies
export interface HandlerConfig {
  dispatch: Dispatch<CacheAction>;
  state: CacheState;
}

// Handler interfaces for dependency injection
export interface HandlerServices {
  server?: {
    fetchItemsForCoordinate: (params: {
      centerCoordId: string;
      maxDepth: number;
    }) => Promise<{
      id: string;
      coordinates: string;
      depth: number;
      name: string;
      content: string;
      url: string;
      parentId: string | null;
      itemType: string;
      ownerId: string;
    }[]>;
    createItem?: (params: { coordId: string; data: MapItemCreateAttributes }) => Promise<unknown>;
    updateItem?: (params: { coordId: string; data: MapItemUpdateAttributes }) => Promise<unknown>;
    deleteItem?: (params: { coordId: string }) => Promise<void>;
  };
  url?: {
    updateMapURL: (centerItemId: string, expandedItems: string[]) => void;
    getCurrentURL: () => { pathname: string; searchParams: URLSearchParams };
  };
  storage?: {
    save: (key: string, data: unknown) => Promise<void>;
    load: (key: string) => Promise<unknown>;
    remove: (key: string) => Promise<void>;
  };
}

// Handler factory types
export type HandlerFactory<T> = (
  config: HandlerConfig & { services: HandlerServices },
) => T;

// Async operation result types
export interface LoadResult {
  success: boolean;
  error?: Error;
  itemsLoaded?: number;
}

export interface NavigationResult {
  success: boolean;
  error?: Error;
  centerUpdated?: boolean;
  urlUpdated?: boolean;
}

export interface MutationResult {
  success: boolean;
  error?: Error;
  optimisticApplied?: boolean;
  rolledBack?: boolean;
}

// Handler operation types
export interface DataOperations {
  loadRegion: (centerCoordId: string, maxDepth?: number) => Promise<LoadResult>;
  loadItemChildren: (
    parentCoordId: string,
    maxDepth?: number,
  ) => Promise<LoadResult>;
  prefetchRegion: (centerCoordId: string) => Promise<LoadResult>;
  invalidateRegion: (regionKey: string) => void;
  invalidateAll: () => void;
}

export interface NavigationOperations {
  navigateToItem: (itemCoordId: string, options?: { pushToHistory?: boolean }) => Promise<NavigationResult>;
  updateCenter: (centerCoordId: string) => void;
  updateURL: (centerItemId: string, expandedItems: string[], compositionExpandedIds?: string[]) => void;
  prefetchForNavigation: (itemCoordId: string) => Promise<void>;
  syncURLWithState: () => void;
  navigateWithoutURL: (itemCoordId: string) => Promise<NavigationResult>;
  getMapContext: () => { centerItemId: string; expandedItems: string[]; compositionExpandedIds: string[]; pathname: string; searchParams: URLSearchParams };
  toggleItemExpansionWithURL: (itemId: string) => void;
  toggleCompositionExpansionWithURL: (coordId: string) => void;
}

export interface MutationOperations {
  createItem: (coordId: string, data: MapItemCreateAttributes) => Promise<MutationResult>;
  updateItem: (coordId: string, data: MapItemUpdateAttributes) => Promise<MutationResult>;
  deleteItem: (coordId: string) => Promise<MutationResult>;
  moveItem: (sourceCoordId: string, targetCoordId: string) => Promise<MutationResult & { isSwap?: boolean }>;
  rollbackOptimisticChange: (changeId: string) => void;
  rollbackAllOptimistic: () => void;
  getPendingOptimisticChanges: () => Array<{
    id: string;
    type: "create" | "update" | "delete";
    coordId: string;
    previousState?: unknown;
    timestamp: number;
  }>;
  // Operation tracking methods for preventing race conditions
  isOperationPending: (coordId: string) => boolean;
  getPendingOperationType: (coordId: string) => 'create' | 'update' | 'delete' | 'move' | null;
  getTilesWithPendingOperations: () => string[];
}
