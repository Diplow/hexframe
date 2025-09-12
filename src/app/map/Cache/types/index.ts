/**
 * Cache-level types reexport index
 * 
 * Provides access to commonly needed types for Cache subsystem components,
 * preventing hierarchical imports like ../../types/tile-data
 */

// Core tile data types
export type { TileData, TileState } from '~/app/map/types';
export { adapt, getColor } from '~/app/map/types';

// URL types for navigation and state management
export type { URLInfo, URLSearchParams } from '~/app/map/types';

// Event types for cache operations and cross-system communication
export type { 
  AppEvent, 
  EventSource,
  EventListener,
  EventBusService,
  MapTileCreatedEvent,
  MapTileUpdatedEvent,
  MapTileDeletedEvent,
  MapTileMovedEvent,
  MapTilesSwappedEvent,
  MapNavigationEvent,
  MapExpansionChangedEvent,
  MapImportCompletedEvent
} from '~/app/map/types';

// Handler types for Cache subsystem operations
export type {
  DataOperations,
  MutationOperations, 
  NavigationOperations,
  LoadResult,
  HandlerConfig,
  HandlerServices
} from '~/app/map/Cache/types/handlers';

// Event validation schemas for cache operations
export {
  mapTileCreatedEventSchema,
  mapTileUpdatedEventSchema,
  mapTileDeletedEventSchema,
  mapTileMovedEventSchema,
  mapTilesSwappedEventSchema,
  validateEvent,
  safeValidateEvent
} from '~/app/map/types';

// Cache-specific types (moved from types.ts)
import type { ReactNode, Dispatch } from "react";
import type { TileData } from "~/app/map/types/tile-data";
import type { CacheState, CacheAction } from "~/app/map/Cache/State/types";
import type {
  DataOperations,
  MutationOperations,
  NavigationOperations,
  LoadResult,
} from '~/app/map/Cache/types/handlers';
import type { ServerService, StorageService, ServiceConfig } from "~/app/map/Cache/Services/types";
import type { SyncOperations, SyncResult, SyncStatus } from "~/app/map/Cache/Sync/types";
import type { EventBusService } from '~/app/map';

// Cache context interface
export interface MapCacheContextValue {
  // Core state
  state: CacheState;
  dispatch: Dispatch<CacheAction>;

  // Handler operations
  dataOperations: DataOperations;
  mutationOperations: MutationOperations;
  navigationOperations: NavigationOperations;
  syncOperations: SyncOperations;

  // Services (for advanced usage)
  serverService: ServerService;
  storageService: StorageService;
}

// Public hook interface
export interface MapCacheHook {
  // State queries
  items: Record<string, TileData>;
  center: string | null;
  expandedItems: string[];
  isLoading: boolean;
  error: Error | null;
  lastUpdated: number;

  // Query operations
  getItem: (coordId: string) => TileData | null;
  getRegionItems: (centerCoordId: string, maxDepth?: number) => TileData[];
  hasItem: (coordId: string) => boolean;
  isRegionLoaded: (centerCoordId: string, maxDepth?: number) => boolean;

  // Hierarchy operations
  getParentHierarchy: (centerCoordId?: string) => TileData[];
  getCenterItem: (centerCoordId?: string) => TileData | null;
  isUserMapCenter: (item: TileData) => boolean;
  shouldShowHierarchy: (hierarchy: TileData[], currentCenter?: string) => boolean;

  // Data operations
  loadRegion: (centerCoordId: string, maxDepth?: number) => Promise<LoadResult>;
  loadItemChildren: (parentCoordId: string, maxDepth?: number) => Promise<LoadResult>;
  prefetchRegion: (centerCoordId: string) => Promise<LoadResult>;
  invalidateRegion: (regionKey: string) => void;
  invalidateAll: () => void;

  // Navigation operations
  navigateToItem: (itemCoordId: string, options?: { pushToHistory?: boolean }) => Promise<void>;
  updateCenter: (centerCoordId: string) => void;
  prefetchForNavigation: (itemCoordId: string) => Promise<void>;
  toggleItemExpansionWithURL: (itemId: string) => void;

  // Mutation operations
  createItemOptimistic: (coordId: string, data: {
    parentId?: number;
    title?: string;
    name?: string;
    description?: string;
    descr?: string;
    url?: string;
  }) => Promise<void>;
  updateItemOptimistic: (coordId: string, data: {
    title?: string;
    name?: string;
    description?: string;
    descr?: string;
    url?: string;
  }) => Promise<void>;
  deleteItemOptimistic: (coordId: string) => Promise<void>;
  moveItemOptimistic: (sourceCoordId: string, targetCoordId: string) => Promise<{ success: boolean; isSwap?: boolean }>;
  rollbackOptimisticChange: (changeId: string) => void;
  rollbackAllOptimistic: () => void;
  getPendingOptimisticChanges: () => Array<{
    id: string;
    type: "create" | "update" | "delete";
    coordId: string;
    timestamp: number;
  }>;

  // Sync operations
  sync: {
    isOnline: boolean;
    lastSyncTime: number | null;
    performSync: () => Promise<SyncResult>;
    forceSync: () => Promise<SyncResult>;
    pauseSync: () => void;
    resumeSync: () => void;
    getSyncStatus: () => SyncStatus;
    serverService?: ServerService; // Expose server service for advanced usage
  };

  // Configuration
  config: CacheState["cacheConfig"];
  updateConfig: (config: Partial<MapCacheHook["config"]>) => void;
}

// Provider configuration
export interface MapCacheProviderProps {
  children: ReactNode;
  initialItems?: Record<string, TileData>;
  initialCenter?: string | null;
  initialExpandedItems?: string[];
  mapContext?: {
    rootItemId: number;
    userId: number;
    groupId: number;
  };
  cacheConfig?: Partial<MapCacheHook["config"]>;
  serverConfig?: ServiceConfig;
  storageConfig?: ServiceConfig;
  eventBus?: EventBusService;
  testingOverrides?: {
    disableSync?: boolean;
    mockRouter?: unknown;
    mockSearchParams?: URLSearchParams;
    mockPathname?: string;
  };
}