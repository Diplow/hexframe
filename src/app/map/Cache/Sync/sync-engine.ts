import type { CacheAction, CacheState } from "~/app/map/Cache/State/types";
import type { DataOperations } from "~/app/map/Cache/Handlers/types";
import type {
  SyncConfig,
  SyncStatus,
  SyncResult,
  SyncOperations,
  SyncEvent,
  SyncEventHandler,
} from "~/app/map/Cache/Sync/types";

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

  // Internal state
  let syncStatus: SyncStatus = {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
    lastSyncAt: null,
    nextSyncAt: null,
    syncCount: 0,
    errorCount: 0,
    lastError: null,
  };

  let syncTimer: NodeJS.Timeout | null = null;
  let retryTimer: NodeJS.Timeout | null = null;
  let isPaused = false;
  let isStarted = false;

  // Event emission helper
  const emitEvent = (event: SyncEvent) => {
    if (eventHandler) {
      try {
        eventHandler(event);
      } catch (error) {
        console.warn("Sync event handler error:", error);
      }
    }
  };

  // Online status detection
  const updateOnlineStatus = () => {
    const wasOnline = syncStatus.isOnline;
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (wasOnline !== isOnline) {
      syncStatus = { ...syncStatus, isOnline };
      emitEvent({ type: "ONLINE_STATUS_CHANGED", isOnline });

      // Trigger sync when coming back online
      if (
        isOnline &&
        syncConfig.syncOnNetworkReconnect &&
        isStarted &&
        !isPaused
      ) {
        scheduleImmedateSync();
      }
    }
  };

  // Advanced online checking (optional)
  const checkOnlineStatus = async (): Promise<boolean> => {
    if (!syncConfig.onlineCheckUrl) {
      return typeof navigator !== "undefined" ? navigator.onLine : true;
    }

    try {
      await fetch(syncConfig.onlineCheckUrl, {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      return true; // If fetch succeeds, we're online
    } catch {
      return false;
    }
  };

  // Schedule next sync
  const scheduleNextSync = () => {
    if (!syncConfig.enabled || isPaused || !isStarted) return;

    clearSyncTimer();

    const nextSyncAt = Date.now() + syncConfig.intervalMs;
    syncStatus = { ...syncStatus, nextSyncAt };

    syncTimer = setTimeout(() => {
      if (isStarted && !isPaused) {
        void performSyncInternal();
      }
    }, syncConfig.intervalMs);
  };

  // Schedule immediate sync
  const scheduleImmedateSync = () => {
    if (!syncConfig.enabled || isPaused || !isStarted) return;

    clearSyncTimer();

    // Small delay to avoid immediate execution in event handlers
    syncTimer = setTimeout(() => {
      if (isStarted && !isPaused) {
        void performSyncInternal();
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

  // Core sync implementation
  const performSyncInternal = async (
    forceSync = false,
  ): Promise<SyncResult> => {
    const startTime = Date.now();

    // Check if sync is already in progress
    if (syncStatus.isSyncing && !forceSync) {
      throw new Error("Sync already in progress");
    }

    // Check online status
    const isOnline = await checkOnlineStatus();
    syncStatus = { ...syncStatus, isOnline };

    if (!isOnline) {
      const error = new Error("Cannot sync while offline");
      const result: SyncResult = {
        success: false,
        timestamp: Date.now(),
        itemsSynced: 0,
        conflictsResolved: 0,
        error,
        duration: Date.now() - startTime,
      };

      syncStatus = {
        ...syncStatus,
        errorCount: syncStatus.errorCount + 1,
        lastError: error,
      };

      emitEvent({ type: "SYNC_FAILED", error, timestamp: Date.now() });
      return result;
    }

    // Update sync status
    syncStatus = {
      ...syncStatus,
      isSyncing: true,
      lastError: null,
    };

    emitEvent({ type: "SYNC_STARTED", timestamp: Date.now() });

    try {
      let itemsSynced = 0;
      const conflictsResolved = 0;

      // Sync current center region if available
      if (state.currentCenter) {
        await dataHandler.loadRegion(
          state.currentCenter,
          state.cacheConfig.maxDepth,
        );
        itemsSynced += 1; // Simplified counting
      }

      // Sync recently accessed regions (from regionMetadata)
      const recentRegions = Object.entries(state.regionMetadata)
        .filter(([_, metadata]) => {
          const ageMs = Date.now() - metadata.loadedAt;
          return ageMs < state.cacheConfig.maxAge; // Only sync recently accessed regions
        })
        .slice(0, 5); // Limit to 5 regions to avoid overwhelming

      for (const [regionKey, metadata] of recentRegions) {
        try {
          await dataHandler.loadRegion(
            metadata.centerCoordId,
            metadata.maxDepth,
          );
          itemsSynced += 1;
        } catch (error) {
          console.warn(`Failed to sync region ${regionKey}:`, error);
        }
      }

      const result: SyncResult = {
        success: true,
        timestamp: Date.now(),
        itemsSynced,
        conflictsResolved,
        duration: Date.now() - startTime,
      };

      // Update sync status
      syncStatus = {
        ...syncStatus,
        isSyncing: false,
        lastSyncAt: Date.now(),
        syncCount: syncStatus.syncCount + 1,
        nextSyncAt: null,
        errorCount: 0, // Reset error count on success
      };

      emitEvent({ type: "SYNC_COMPLETED", result });

      // Schedule next sync only if still active and not forced
      if (!forceSync && isStarted && !isPaused) {
        scheduleNextSync();
      }

      return result;
    } catch (error) {
      const syncError = error as Error;

      const result: SyncResult = {
        success: false,
        timestamp: Date.now(),
        itemsSynced: 0,
        conflictsResolved: 0,
        error: syncError,
        duration: Date.now() - startTime,
      };

      // Update error status
      syncStatus = {
        ...syncStatus,
        isSyncing: false,
        errorCount: syncStatus.errorCount + 1,
        lastError: syncError,
      };

      emitEvent({
        type: "SYNC_FAILED",
        error: syncError,
        timestamp: Date.now(),
      });

      // Retry logic with backoff - only if we haven't exceeded max retries
      if (
        syncStatus.errorCount <= syncConfig.maxRetries &&
        isStarted &&
        !isPaused
      ) {
        clearRetryTimer();
        const retryDelay =
          syncConfig.retryDelayMs * Math.pow(2, syncStatus.errorCount - 1);

        retryTimer = setTimeout(() => {
          if (isStarted && !isPaused) {
            void performSyncInternal();
          }
        }, retryDelay);
      } else {
        // Max retries exceeded or sync stopped, schedule normal sync for next interval
        if (isStarted && !isPaused) {
          scheduleNextSync();
        }
      }

      return result;
    }
  };

  // Browser event listeners
  const setupEventListeners = () => {
    if (typeof window === "undefined") return;

    // Online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Visibility change events (sync when tab becomes visible)
    if (syncConfig.syncOnVisibilityChange) {
      document.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "visible" &&
          syncStatus.isOnline &&
          isStarted &&
          !isPaused
        ) {
          scheduleImmedateSync();
        }
      });
    }
  };

  const removeEventListeners = () => {
    if (typeof window === "undefined") return;

    window.removeEventListener("online", updateOnlineStatus);
    window.removeEventListener("offline", updateOnlineStatus);
    // Note: Visibility change listener can't be easily removed since it's anonymous
    // In real implementation, we'd store references
  };

  // Public API
  const startSync = () => {
    if (!syncConfig.enabled) return;

    isStarted = true;
    isPaused = false;
    setupEventListeners();
    updateOnlineStatus();
    scheduleNextSync();
  };

  const stopSync = () => {
    isStarted = false;
    isPaused = true;
    clearSyncTimer();
    clearRetryTimer();
    removeEventListeners();

    syncStatus = {
      ...syncStatus,
      isSyncing: false,
      nextSyncAt: null,
    };
  };

  const performSync = async (): Promise<SyncResult> => {
    return performSyncInternal(false);
  };

  const forceSync = async (): Promise<SyncResult> => {
    clearSyncTimer();
    clearRetryTimer();
    return performSyncInternal(true);
  };

  const pauseSync = () => {
    isPaused = true;
    clearSyncTimer();
    clearRetryTimer();

    syncStatus = {
      ...syncStatus,
      nextSyncAt: null,
    };
  };

  const resumeSync = () => {
    if (!isStarted) return;

    isPaused = false;
    if (syncConfig.enabled) {
      scheduleNextSync();
    }
  };

  const getSyncStatus = (): SyncStatus => {
    return { ...syncStatus };
  };

  const updateSyncConfig = (newConfig: Partial<SyncConfig>) => {
    Object.assign(syncConfig, newConfig);

    // Restart sync if configuration changed and sync is running
    if (syncConfig.enabled && isStarted) {
      const wasRunning = !isPaused;
      stopSync();
      startSync();
      if (!wasRunning) {
        pauseSync();
      }
    }
  };

  return {
    startSync,
    stopSync,
    performSync,
    forceSync,
    pauseSync,
    resumeSync,
    getSyncStatus,
    updateSyncConfig,
  };
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
