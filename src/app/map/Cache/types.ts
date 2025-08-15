import type { ReactNode, Dispatch } from "react";
import type { TileData } from "../types/tile-data";
import type { CacheState, CacheAction } from "./State/types";
import type {
  DataOperations,
  MutationOperations,
  NavigationOperations,
  LoadResult,
} from "./Handlers/types";
import type { ServerService, StorageService, ServiceConfig } from "./Services/types";
import type { SyncOperations, SyncResult, SyncStatus } from "./Sync/types";
import type { EventBusService } from "~/app/map/types/events";

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