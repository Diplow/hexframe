import type { SyncConfig, SyncStatus } from "./types";

export interface TimerManager {
  scheduleNextSync: () => void;
  scheduleImmedateSync: () => void;
  clearSyncTimer: () => void;
  clearRetryTimer: () => void;
  cleanup: () => void;
}

export function createTimerManager(
  syncConfig: SyncConfig,
  syncStatus: { current: SyncStatus },
  isStarted: { current: boolean },
  isPaused: { current: boolean },
  onSyncTrigger: () => void
): TimerManager {
  let syncTimer: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;

  // Schedule next sync
  const scheduleNextSync = () => {
    if (!syncConfig.enabled || isPaused.current || !isStarted.current) return;

    clearSyncTimer();

    const nextSyncAt = Date.now() + syncConfig.intervalMs;
    syncStatus.current = { ...syncStatus.current, nextSyncAt };

    syncTimer = setTimeout(() => {
      if (isStarted.current && !isPaused.current) {
        onSyncTrigger();
      }
    }, syncConfig.intervalMs);
  };

  // Schedule immediate sync
  const scheduleImmedateSync = () => {
    if (!syncConfig.enabled || isPaused.current || !isStarted.current) return;

    clearSyncTimer();

    // Small delay to avoid immediate execution in event handlers
    syncTimer = setTimeout(() => {
      if (isStarted.current && !isPaused.current) {
        onSyncTrigger();
      }
    }, 100);
  };

  // Clear timers
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

  const cleanup = () => {
    clearSyncTimer();
    clearRetryTimer();
  };

  return {
    scheduleNextSync,
    scheduleImmedateSync,
    clearSyncTimer,
    clearRetryTimer,
    cleanup,
  };
}