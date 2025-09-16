import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
} from "~/app/map/Cache/Sync/types";
import type { createSyncStatusManager } from "~/app/map/Cache/Sync/_internals/sync-status";
import type { createSyncTimerManager } from "~/app/map/Cache/Sync/_internals/sync-timers";
import type { createSyncEventManager } from "~/app/map/Cache/Sync/_internals/sync-events";

export interface SyncControlConfig {
  syncConfig: SyncConfig;
  syncStatus: SyncStatus;
  isStarted: boolean;
  isPaused: boolean;
  statusManager: ReturnType<typeof createSyncStatusManager>;
  timerManager: ReturnType<typeof createSyncTimerManager>;
  eventManager: ReturnType<typeof createSyncEventManager>;
  performSyncInternal: (forceSync?: boolean) => Promise<SyncResult>;
  updateState: (started: boolean, paused: boolean) => void;
  updateStatus: (status: SyncStatus) => void;
  handleOnlineStatusChange: () => void;
}

/**
 * Create sync control operations (start, stop, pause, resume, force)
 */
export function createSyncControlOperations(config: SyncControlConfig) {
  const {
    syncConfig,
    syncStatus,
    isStarted,
    timerManager,
    eventManager,
    performSyncInternal,
    updateState,
    updateStatus,
    handleOnlineStatusChange,
  } = config;

  return {
    startSync: () => {
      if (!syncConfig.enabled) return;
      updateState(true, false);
      eventManager.setupEventListeners();
      handleOnlineStatusChange();
      const nextSyncAt = timerManager.scheduleNextSync(true, false);
      if (nextSyncAt) {
        updateStatus({ ...syncStatus, nextSyncAt });
      }
    },
    
    stopSync: () => {
      updateState(false, true);
      timerManager.clearAllTimers();
      eventManager.removeEventListeners();
      updateStatus({ ...syncStatus, isSyncing: false, nextSyncAt: null });
    },
    
    forceSync: async () => {
      timerManager.clearAllTimers();
      return performSyncInternal(true);
    },
    
    pauseSync: () => {
      updateState(isStarted, true);
      timerManager.clearAllTimers();
      updateStatus({ ...syncStatus, nextSyncAt: null });
    },
    
    resumeSync: () => {
      if (!isStarted) return;
      updateState(isStarted, false);
      if (syncConfig.enabled) {
        const nextSyncAt = timerManager.scheduleNextSync(isStarted, false);
        if (nextSyncAt) {
          updateStatus({ ...syncStatus, nextSyncAt });
        }
      }
    },
  };
}