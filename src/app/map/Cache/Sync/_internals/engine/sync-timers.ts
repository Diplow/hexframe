import type { SyncConfig } from "~/app/map/Cache/Sync/types";

/**
 * Timer management for sync operations
 */
export function createSyncTimerManager(
  syncConfig: SyncConfig,
  onSyncTrigger: () => void,
) {
  let syncTimer: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;

  const clearSyncTimer = () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
  };

  const clearRetryTimer = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const clearAllTimers = () => {
    clearSyncTimer();
    clearRetryTimer();
  };

  const scheduleNextSync = (
    isStarted: boolean,
    isPaused: boolean,
  ): number | null => {
    if (!syncConfig.enabled || isPaused || !isStarted) return null;

    clearSyncTimer();

    const nextSyncAt = Date.now() + syncConfig.intervalMs;

    syncTimer = setTimeout(() => {
      if (isStarted && !isPaused) {
        onSyncTrigger();
      }
    }, syncConfig.intervalMs);

    return nextSyncAt;
  };

  const scheduleImmediateSync = (isStarted: boolean, isPaused: boolean) => {
    if (!syncConfig.enabled || isPaused || !isStarted) return;

    clearSyncTimer();

    // Small delay to avoid immediate execution in event handlers
    syncTimer = setTimeout(() => {
      if (isStarted && !isPaused) {
        onSyncTrigger();
      }
    }, 100);
  };

  const scheduleRetrySync = (
    errorCount: number,
    isStarted: boolean,
    isPaused: boolean,
  ) => {
    clearRetryTimer();
    const retryDelay = syncConfig.retryDelayMs * Math.pow(2, errorCount - 1);

    retryTimer = setTimeout(() => {
      if (isStarted && !isPaused) {
        onSyncTrigger();
      }
    }, retryDelay);
  };

  return {
    clearSyncTimer,
    clearRetryTimer,
    clearAllTimers,
    scheduleNextSync,
    scheduleImmediateSync,
    scheduleRetrySync,
  };
}