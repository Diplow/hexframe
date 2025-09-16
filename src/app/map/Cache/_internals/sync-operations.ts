import type { SyncOperations } from "~/app/map/Cache/Sync/types";
import type { ServerService } from "~/app/map/Cache/Services/types";

/**
 * Create sync operations object for the public MapCache API
 */
export function createSyncOperationsAPI(
  syncOperations: SyncOperations,
  serverService?: ServerService
) {
  const syncStatus = syncOperations.getSyncStatus();

  return {
    isOnline: syncStatus.isOnline,
    lastSyncTime: syncStatus.lastSyncAt,
    performSync: syncOperations.performSync,
    forceSync: syncOperations.forceSync,
    pauseSync: syncOperations.pauseSync,
    resumeSync: syncOperations.resumeSync,
    getSyncStatus: syncOperations.getSyncStatus,
    serverService,
  };
}