import type { SyncStatus } from "~/app/map/Cache/Sync/types";

/**
 * Online status detection and management utilities
 */
export function createOnlineStatusManager() {
  const getInitialOnlineStatus = (): boolean => {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  };

  const checkAdvancedOnlineStatus = async (
    onlineCheckUrl?: string,
  ): Promise<boolean> => {
    if (!onlineCheckUrl) {
      return getInitialOnlineStatus();
    }

    try {
      await fetch(onlineCheckUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      return true;
    } catch {
      return false;
    }
  };

  return {
    getInitialOnlineStatus,
    checkAdvancedOnlineStatus,
  };
}

/**
 * Sync status state management utilities
 */
export function createSyncStatusManager() {
  const createInitialStatus = (): SyncStatus => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncAt: null,
    nextSyncAt: null,
    syncCount: 0,
    errorCount: 0,
    lastError: null,
  });

  const updateOnlineStatus = (
    currentStatus: SyncStatus,
    isOnline: boolean,
  ): { status: SyncStatus; changed: boolean } => {
    const changed = currentStatus.isOnline !== isOnline;
    return {
      status: { ...currentStatus, isOnline },
      changed,
    };
  };

  const updateSyncStart = (currentStatus: SyncStatus): SyncStatus => ({
    ...currentStatus,
    isSyncing: true,
    lastError: null,
  });

  const updateSyncSuccess = (currentStatus: SyncStatus): SyncStatus => ({
    ...currentStatus,
    isSyncing: false,
    lastSyncAt: Date.now(),
    syncCount: currentStatus.syncCount + 1,
    nextSyncAt: null,
    errorCount: 0,
  });

  const updateSyncError = (
    currentStatus: SyncStatus,
    error: Error,
  ): SyncStatus => ({
    ...currentStatus,
    isSyncing: false,
    errorCount: currentStatus.errorCount + 1,
    lastError: error,
  });

  return {
    createInitialStatus,
    updateOnlineStatus,
    updateSyncStart,
    updateSyncSuccess,
    updateSyncError,
  };
}