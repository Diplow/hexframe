import type {
  SyncEvent,
  SyncEventHandler,
} from "~/app/map/Cache/Sync/types";

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
