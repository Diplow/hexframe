import type {
  SyncEvent,
  SyncEventHandler,
  SyncConfig,
  SyncStatus,
} from "~/app/map/Cache/Sync/types";

/**
 * Browser event listener management for sync operations
 */
export function createSyncEventManager(
  syncConfig: SyncConfig,
  syncStatus: SyncStatus,
  onOnlineStatusChange: () => void,
  onVisibilitySync: () => void,
) {
  let visibilityHandler: (() => void) | null = null;

  const setupEventListeners = () => {
    if (typeof window === "undefined") return;

    // Online/offline events
    window.addEventListener("online", onOnlineStatusChange);
    window.addEventListener("offline", onOnlineStatusChange);

    // Visibility change events (sync when tab becomes visible)
    if (syncConfig.syncOnVisibilityChange) {
      visibilityHandler = () => {
        if (document.visibilityState === "visible" && syncStatus.isOnline) onVisibilitySync();
        };
      document.addEventListener("visibilitychange", visibilityHandler);
    }
  };

  const removeEventListeners = () => {
    if (typeof window === "undefined") return;

    window.removeEventListener("online", onOnlineStatusChange);
    window.removeEventListener("offline", onOnlineStatusChange);

    if (visibilityHandler) {
      document.removeEventListener("visibilitychange", visibilityHandler);
      visibilityHandler = null;
    }
  };

  return {
    setupEventListeners,
    removeEventListeners,
  };
}

/**
 * Event emission utilities for sync operations
 */
export function createSyncEventEmitter(eventHandler?: SyncEventHandler) {
  const emitEvent = (event: SyncEvent) => {
    if (eventHandler) {
      try {
        eventHandler(event);
      } catch (error) {
        console.warn("Sync event handler error:", error);
      }
    }
  };

  return { emitEvent };
}