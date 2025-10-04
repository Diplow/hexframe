import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncOperations,
} from "~/app/map/Cache/Sync/types";
import type { CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { createOnlineStatusManager, createSyncStatusManager } from "~/app/map/Cache/Sync/_internals/engine/sync-status";
import { createSyncTimerManager } from "~/app/map/Cache/Sync/_internals/engine/sync-timers";
import { createSyncEventManager, type createSyncEventEmitter } from "~/app/map/Cache/Sync/_internals/engine/sync-events";
import { createSyncControlOperations } from "~/app/map/Cache/Sync/_internals/engine/sync-control-operations";
import { createSyncEventHandlers } from "~/app/map/Cache/Sync/_internals/engine/sync-event-handlers";

/**
 * Core sync operation implementation
 */
export async function performSyncOperation(
  state: CacheState,
  dataHandler: DataOperations,
): Promise<{ itemsSynced: number; conflictsResolved: number }> {
  let itemsSynced = 0;
  const conflictsResolved = 0;

  // Sync current center region if available
  if (state.currentCenter) {
    await dataHandler.loadRegion(
      state.currentCenter,
      state.cacheConfig.maxDepth,
    );
    itemsSynced += 1;
  }

  // Sync recently accessed regions (from regionMetadata)
  const recentRegions = Object.entries(state.regionMetadata)
    .filter(([_, metadata]) => {
      const ageMs = Date.now() - metadata.loadedAt;
      return ageMs < state.cacheConfig.maxAge;
    })
    .slice(0, 5); // Limit to 5 regions to avoid overwhelming

  for (const [regionKey, metadata] of recentRegions) {
    try {
      await dataHandler.loadRegion(metadata.centerCoordId, metadata.maxDepth);
      itemsSynced += 1;
    } catch (error) {
      console.warn(`Failed to sync region ${regionKey}:`, error);
    }
  }

  return { itemsSynced, conflictsResolved };
}

/**
 * Create sync result objects
 */
export function createSyncResult(
  success: boolean,
  startTime: number,
  itemsSynced: number,
  conflictsResolved: number,
  error?: Error,
): SyncResult {
  return {
    success,
    timestamp: Date.now(),
    itemsSynced,
    conflictsResolved,
    error,
    duration: Date.now() - startTime,
  };
}

export interface PublicSyncAPIConfig {
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  isStarted: boolean;
  isPaused: boolean;
  statusManager: ReturnType<typeof createSyncStatusManager>;
  onlineManager: ReturnType<typeof createOnlineStatusManager>;
  eventEmitter: ReturnType<typeof createSyncEventEmitter>;
  performSyncInternal: (forceSync?: boolean) => Promise<SyncResult>;
  updateState: (started: boolean, paused: boolean) => void;
  updateStatus: (status: SyncStatus) => void;
}

/**
 * Create the public sync operations API
 */
export function createPublicSyncAPI(config: PublicSyncAPIConfig): SyncOperations {
  const {
    syncConfig,
    syncStatus,
    isStarted,
    isPaused,
    statusManager,
    onlineManager,
    eventEmitter,
    performSyncInternal,
    updateState,
    updateStatus
  } = config;

  // Initialize timer manager with sync trigger
  const timerManager = createSyncTimerManager(syncConfig, () => {
    void performSyncInternal();
  });

  // Create event handlers
  const { handleOnlineStatusChange, handleVisibilitySync } = createSyncEventHandlers({
    syncConfig,
    syncStatus,
    isStarted,
    isPaused,
    statusManager,
    onlineManager,
    eventEmitter,
    updateStatus,
    timerManager,
  });

  // Initialize event manager
  const eventManager = createSyncEventManager(
    syncConfig,
    syncStatus,
    handleOnlineStatusChange,
    handleVisibilitySync
  );

  // Create sync control operations
  const controlOps = createSyncControlOperations({
    syncConfig,
    syncStatus,
    isStarted,
    isPaused,
    statusManager,
    timerManager,
    eventManager,
    performSyncInternal,
    updateState,
    updateStatus,
    handleOnlineStatusChange,
  });

  return {
    ...controlOps,
    performSync: () => performSyncInternal(false),
    getSyncStatus: () => ({ ...syncStatus }),
    updateSyncConfig: (newConfig: Partial<SyncConfig>) => {
      Object.assign(syncConfig, newConfig);
    },
  };
}