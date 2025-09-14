import type { CacheState } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import type { SyncResult } from "~/app/map/Cache/Sync/types";

/**
 * Core sync operation implementation
 */
export async function performSyncOperation(
  state: CacheState,
  dataHandler: DataOperations,
): Promise<{ itemsSynced: number; conflictsResolved: number }> {
  let itemsSynced = 0;
  const conflictsResolved = 0;

  // Sync current center region if available
  if (state.currentCenter) {
    await dataHandler.loadRegion(
      state.currentCenter,
      state.cacheConfig.maxDepth,
    );
    itemsSynced += 1;
  }

  // Sync recently accessed regions (from regionMetadata)
  const recentRegions = Object.entries(state.regionMetadata)
    .filter(([_, metadata]) => {
      const ageMs = Date.now() - metadata.loadedAt;
      return ageMs < state.cacheConfig.maxAge;
    })
    .slice(0, 5); // Limit to 5 regions to avoid overwhelming

  for (const [regionKey, metadata] of recentRegions) {
    try {
      await dataHandler.loadRegion(metadata.centerCoordId, metadata.maxDepth);
      itemsSynced += 1;
    } catch (error) {
      console.warn(`Failed to sync region ${regionKey}:`, error);
    }
  }

  return { itemsSynced, conflictsResolved };
}

/**
 * Create sync result objects
 */
export function createSyncResult(
  success: boolean,
  startTime: number,
  itemsSynced: number,
  conflictsResolved: number,
  error?: Error,
): SyncResult {
  return {
    success,
    timestamp: Date.now(),
    itemsSynced,
    conflictsResolved,
    error,
    duration: Date.now() - startTime,
  };
}