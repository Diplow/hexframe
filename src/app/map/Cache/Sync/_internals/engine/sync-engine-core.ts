import type { CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncOperations,
  SyncEventHandler,
} from "~/app/map/Cache/Sync/types";
import { createOnlineStatusManager, createSyncStatusManager } from "~/app/map/Cache/Sync/_internals/engine/sync-status";
import { createSyncEventEmitter } from "~/app/map/Cache/Sync/_internals/engine/sync-events";
import { performSyncOperation, createSyncResult, createPublicSyncAPI } from "~/app/map/Cache/Sync/_internals/sync-api";

export interface SyncEngineConfig {
  state: CacheState;
  dataHandler: DataOperations;
  syncConfig: SyncConfig;
  eventHandler?: SyncEventHandler;
}

/**
 * Context for executing a sync operation
 */
interface SyncOperationContext {
  forceSync: boolean;
  syncStatus: SyncStatus;
  syncConfig: SyncConfig;
  state: CacheState;
  dataHandler: DataOperations;
  statusManager: ReturnType<typeof createSyncStatusManager>;
  eventEmitter: ReturnType<typeof createSyncEventEmitter>;
  onlineManager: ReturnType<typeof createOnlineStatusManager>;
  updateStatus: (status: SyncStatus) => void;
}

/**
 * Execute sync operation with proper error handling and status updates
 */
export async function executeSyncOperation(
  context: SyncOperationContext
): Promise<SyncResult> {
  const {
    forceSync,
    syncStatus,
    syncConfig,
    state,
    dataHandler,
    statusManager,
    eventEmitter,
    onlineManager,
    updateStatus,
  } = context;
  const startTime = Date.now();

  if (syncStatus.isSyncing && !forceSync) {
    throw new Error("Sync already in progress");
  }

  const isOnline = await onlineManager.checkAdvancedOnlineStatus(syncConfig.onlineCheckUrl);
  updateStatus(statusManager.updateOnlineStatus(syncStatus, isOnline).status);
  
  if (!isOnline) {
    const error = new Error("Cannot sync while offline");
    updateStatus(statusManager.updateSyncError(syncStatus, error));
    eventEmitter.emitEvent({ type: "SYNC_FAILED", error, timestamp: Date.now() });
    return createSyncResult(false, startTime, 0, 0, error);
  }

  updateStatus(statusManager.updateSyncStart(syncStatus));
  eventEmitter.emitEvent({ type: "SYNC_STARTED", timestamp: Date.now() });

  try {
    const { itemsSynced, conflictsResolved } = await performSyncOperation(state, dataHandler);
    updateStatus(statusManager.updateSyncSuccess(syncStatus));
    const result = createSyncResult(true, startTime, itemsSynced, conflictsResolved);
    eventEmitter.emitEvent({ type: "SYNC_COMPLETED", result });
    return result;
  } catch (error) {
    const syncError = error as Error;
    updateStatus(statusManager.updateSyncError(syncStatus, syncError));
    const result = createSyncResult(false, startTime, 0, 0, syncError);
    eventEmitter.emitEvent({ type: "SYNC_FAILED", error: syncError, timestamp: Date.now() });
    return result;
  }
}

/**
 * Core sync engine implementation with extracted functionality
 */
export function createSyncEngineCore(config: SyncEngineConfig): SyncOperations {
  const { state, dataHandler, eventHandler, syncConfig } = config;

  // Initialize managers
  const statusManager = createSyncStatusManager();
  const onlineManager = createOnlineStatusManager();
  const eventEmitter = createSyncEventEmitter(eventHandler);

  // Internal state
  let syncStatus = statusManager.createInitialStatus();
  let isPaused = false;
  let isStarted = false;

  // Core sync operation
  const performSyncInternal = async (forceSync = false): Promise<SyncResult> => {
    return executeSyncOperation({
      forceSync,
      syncStatus,
      syncConfig,
      state,
      dataHandler,
      statusManager,
      eventEmitter,
      onlineManager,
      updateStatus: (status) => { syncStatus = status; },
    });
  };

  return createPublicSyncAPI({
    syncConfig,
    syncStatus,
    isStarted: () => isStarted,
    isPaused: () => isPaused,
    statusManager,
    onlineManager,
    eventEmitter,
    performSyncInternal,
    updateState: (started, paused) => { isStarted = started; isPaused = paused; },
    updateStatus: (status) => { syncStatus = status; }
  });
}