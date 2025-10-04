import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { DataOperations } from "~/app/map/Cache/types/handlers";
import { loggers } from "~/lib/debug/debug-logger";
import type { NavigationResult } from "~/app/map/Cache/Handlers/NavigationHandler/_core/navigation-core";

/**
 * Core navigation operations for navigation handler
 */

/**
 * Update the current center coordinate
 */
export function updateCenter(
  centerCoordId: string,
  dispatch: React.Dispatch<CacheAction>
): void {
  loggers.mapCache.handlers('[NavigationHandler.updateCenter] Called with:', {
    centerCoordId,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  dispatch(cacheActions.setCenter(centerCoordId));
}

/**
 * Prefetch data for navigation without affecting current state
 */
export async function prefetchForNavigation(
  itemCoordId: string,
  dataHandler: DataOperations
): Promise<void> {
  loggers.mapCache.handlers('[NavigationHandler.prefetchForNavigation] Called with:', {
    itemCoordId,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  // Prefetch without affecting current state
  await dataHandler.prefetchRegion(itemCoordId);
}

/**
 * Navigate to item without updating URL
 */
export async function navigateWithoutURL(
  itemCoordId: string,
  getState: () => CacheState,
  dispatch: React.Dispatch<CacheAction>,
  dataHandler: DataOperations
): Promise<NavigationResult> {
  loggers.mapCache.handlers('[NavigationHandler.navigateWithoutURL] Called with:', {
    itemCoordId,
    timestamp: new Date().toISOString(),
    stackTrace: new Error().stack
  });
  try {
    // Load region if needed
    await dataHandler.loadRegion(itemCoordId, getState().cacheConfig.maxDepth);

    // Update only cache center, not URL
    dispatch(cacheActions.setCenter(itemCoordId));

    return {
      success: true,
      centerUpdated: true,
      urlUpdated: false,
    };
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    dispatch(cacheActions.setError(errorObj));

    return {
      success: false,
      error: errorObj,
      centerUpdated: false,
      urlUpdated: false,
    };
  }
}