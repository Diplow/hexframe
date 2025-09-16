import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncOperations,
} from "~/app/map/Cache/Sync/types";
import type { createOnlineStatusManager, createSyncStatusManager } from "~/app/map/Cache/Sync/_internals/sync-status";
import { createSyncTimerManager } from "~/app/map/Cache/Sync/_internals/sync-timers";
import { createSyncEventManager, type createSyncEventEmitter } from "~/app/map/Cache/Sync/_internals/sync-events";
import { createSyncControlOperations } from "~/app/map/Cache/Sync/_internals/sync-control-operations";

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
 * Create event handlers for sync operations
 */
export function createSyncEventHandlers(
  syncConfig: SyncConfig,
  syncStatus: SyncStatus,
  isStarted: boolean,
  isPaused: boolean,
  statusManager: ReturnType<typeof createSyncStatusManager>,
  onlineManager: ReturnType<typeof createOnlineStatusManager>,
  eventEmitter: ReturnType<typeof createSyncEventEmitter>,
  updateStatus: (status: SyncStatus) => void,
  timerManager: ReturnType<typeof createSyncTimerManager>
): {
  handleOnlineStatusChange: () => void;
  handleVisibilitySync: () => void;
} {
  const handleOnlineStatusChange = () => {
    const isOnline = onlineManager.getInitialOnlineStatus();
    const { status: newStatus, changed } = statusManager.updateOnlineStatus(syncStatus, isOnline);
    updateStatus(newStatus);
    
    if (changed) {
      eventEmitter.emitEvent({ type: "ONLINE_STATUS_CHANGED", isOnline });
      if (isOnline && syncConfig.syncOnNetworkReconnect && isStarted && !isPaused) {
        timerManager.scheduleImmediateSync(isStarted, isPaused);
      }
    }
  };

  const handleVisibilitySync = () => {
    if (isStarted && !isPaused) {
      timerManager.scheduleImmediateSync(isStarted, isPaused);
    }
  };

  return { handleOnlineStatusChange, handleVisibilitySync };
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
  const { handleOnlineStatusChange, handleVisibilitySync } = createSyncEventHandlers(
    syncConfig,
    syncStatus,
    isStarted,
    isPaused,
    statusManager,
    onlineManager,
    eventEmitter,
    updateStatus,
    timerManager
  );

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