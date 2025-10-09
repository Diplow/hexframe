import type { SyncConfig, SyncStatus } from "~/app/map/Cache/Sync/types";
import type { createOnlineStatusManager, createSyncStatusManager } from "~/app/map/Cache/Sync/_internals/engine/sync-status";
import type { createSyncTimerManager } from "~/app/map/Cache/Sync/_internals/engine/sync-timers";
import type { createSyncEventEmitter } from "~/app/map/Cache/Sync/_internals/engine/sync-events";

/**
 * Dependencies for creating sync event handlers
 */
export interface SyncHandlerDependencies {
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  isStarted: () => boolean;
  isPaused: () => boolean;
  statusManager: ReturnType<typeof createSyncStatusManager>;
  onlineManager: ReturnType<typeof createOnlineStatusManager>;
  eventEmitter: ReturnType<typeof createSyncEventEmitter>;
  updateStatus: (status: SyncStatus) => void;
  timerManager: ReturnType<typeof createSyncTimerManager>;
}

/**
 * Create event handlers for sync operations
 */
export function createSyncEventHandlers(
  deps: SyncHandlerDependencies
): {
  handleOnlineStatusChange: () => void;
  handleVisibilitySync: () => void;
} {
  const {
    syncConfig,
    syncStatus,
    isStarted,
    isPaused,
    statusManager,
    onlineManager,
    eventEmitter,
    updateStatus,
    timerManager,
  } = deps;

  const handleOnlineStatusChange = () => {
    const isOnline = onlineManager.getInitialOnlineStatus();
    const { status: newStatus, changed } = statusManager.updateOnlineStatus(syncStatus, isOnline);
    updateStatus(newStatus);

    if (changed) {
      eventEmitter.emitEvent({ type: "ONLINE_STATUS_CHANGED", isOnline });
      const started = isStarted();
      const paused = isPaused();
      if (isOnline && syncConfig.syncOnNetworkReconnect && started && !paused) {
        timerManager.scheduleImmediateSync(started, paused);
      }
    }
  };

  const handleVisibilitySync = () => {
    const started = isStarted();
    const paused = isPaused();
    if (started && !paused) {
      timerManager.scheduleImmediateSync(started, paused);
    }
  };

  return { handleOnlineStatusChange, handleVisibilitySync };
}
