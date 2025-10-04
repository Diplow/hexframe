import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type {
  SyncConfig,
  SyncOperations,
  SyncEventHandler,
} from "~/app/map/Cache/Sync/types";
import { createSyncEngineCore } from "~/app/map/Cache/Sync/_internals/engine/sync-engine-core";

// Default sync configuration
const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
  retryDelayMs: 5000, // 5 seconds
  maxRetries: 3,
  enableConflictResolution: true,
  syncOnVisibilityChange: true,
  syncOnNetworkReconnect: true,
};

export interface SyncEngineConfig {
  dispatch: React.Dispatch<CacheAction>;
  state: CacheState;
  dataHandler: DataOperations;
  syncConfig?: Partial<SyncConfig>;
  eventHandler?: SyncEventHandler;
}

/**
 * Sync Engine for background cache synchronization
 * Handles periodic refresh, online/offline detection, and conflict resolution coordination
 */
export function createSyncEngine(config: SyncEngineConfig): SyncOperations {
  const { state, dataHandler, eventHandler } = config;
  const syncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    ...config.syncConfig,
  };

  return createSyncEngineCore({
    state,
    dataHandler,
    syncConfig,
    eventHandler,
  });
}

/**
 * Hook-based factory for use in React components
 */
export function useSyncEngine(
  dispatch: React.Dispatch<CacheAction>,
  state: CacheState,
  dataHandler: DataOperations,
  syncConfig?: Partial<SyncConfig>,
  eventHandler?: SyncEventHandler,
): SyncOperations {
  return createSyncEngine({
    dispatch,
    state,
    dataHandler,
    syncConfig,
    eventHandler,
  });
}

/**
 * Factory function for testing with mocked dependencies
 */
export function createSyncEngineForTesting(
  dispatch: React.Dispatch<CacheAction>,
  state: CacheState,
  dataHandler: DataOperations,
  syncConfig?: Partial<SyncConfig>,
  eventHandler?: SyncEventHandler,
): SyncOperations {
  return createSyncEngine({
    dispatch,
    state,
    dataHandler,
    syncConfig: {
      ...DEFAULT_SYNC_CONFIG,
      enabled: false, // Disabled by default for testing
      ...syncConfig,
    },
    eventHandler,
  });
}
