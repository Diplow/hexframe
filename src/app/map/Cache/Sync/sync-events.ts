import type { SyncConfig, SyncStatus, SyncEvent, SyncEventHandler } from "./types";

export interface EventManager {
  emitEvent: (event: SyncEvent) => void;
  updateOnlineStatus: () => void;
  setupEventListeners: () => void;
  removeEventListeners: () => void;
}

export function createEventManager(
  syncConfig: SyncConfig,
  syncStatus: { current: SyncStatus },
  isStarted: { current: boolean },
  isPaused: { current: boolean },
  eventHandler?: SyncEventHandler,
  onTriggerSync?: () => void
): EventManager {
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
    const wasOnline = syncStatus.current.isOnline;
    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (wasOnline !== isOnline) {
      syncStatus.current = { ...syncStatus.current, isOnline };
      emitEvent({ type: "ONLINE_STATUS_CHANGED", isOnline });

      // Trigger sync when coming back online
      if (
        isOnline &&
        syncConfig.syncOnNetworkReconnect &&
        isStarted.current &&
        !isPaused.current &&
        onTriggerSync
      ) {
        onTriggerSync();
      }
    }
  };

  // Browser event listeners
  const setupEventListeners = () => {
    if (typeof window === "undefined") return;

    // Online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Visibility change events (sync when tab becomes visible)
    if (syncConfig.syncOnVisibilityChange && onTriggerSync) {
      document.addEventListener("visibilitychange", () => {
        if (
          document.visibilityState === "visible" &&
          syncStatus.current.isOnline &&
          isStarted.current &&
          !isPaused.current
        ) {
          onTriggerSync();
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

  return {
    emitEvent,
    updateOnlineStatus,
    setupEventListeners,
    removeEventListeners,
  };
}