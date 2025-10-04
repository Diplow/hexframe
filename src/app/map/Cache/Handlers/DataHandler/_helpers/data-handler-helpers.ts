import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State/actions";
import type { LoadResult } from "~/app/map/Cache/types/handlers";
import type { DataHandlerServices } from "~/app/map/Cache/Handlers/DataHandler/data-handler";

/**
 * Options for fetching and dispatching items
 */
export interface FetchAndDispatchOptions {
  centerCoordId: string;
  maxDepth: number;
  actionType: 'loadRegion' | 'loadItemChildren' | 'Prefetch';
  showLoading: boolean;
  silentFail?: boolean;
}

/**
 * Helper function to fetch items from server and dispatch to cache
 */
export async function fetchAndDispatchItems(
  services: DataHandlerServices,
  dispatch: React.Dispatch<CacheAction>,
  options: FetchAndDispatchOptions
): Promise<LoadResult> {
  const { centerCoordId, maxDepth, actionType, showLoading, silentFail } = options;

  if (showLoading) {
    dispatch(cacheActions.setLoading(true));
  }

  try {
    const items = await services.server.fetchItemsForCoordinate({ centerCoordId, maxDepth });

    if (actionType === 'loadRegion' || actionType === 'Prefetch') {
      dispatch(cacheActions.loadRegion(
        items as Parameters<typeof cacheActions.loadRegion>[0],
        centerCoordId,
        maxDepth
      ));
    } else {
      dispatch(cacheActions.loadItemChildren(
        items as Parameters<typeof cacheActions.loadItemChildren>[0],
        centerCoordId,
        maxDepth
      ));
    }

    return { success: true, itemsLoaded: items.length };
  } catch (error) {
    const errorObj = error as Error;

    if (silentFail) {
      console.warn(`${actionType} failed:`, error);
    } else {
      dispatch(cacheActions.setError(errorObj));
    }

    return { success: false, error: errorObj, itemsLoaded: 0 };
  } finally {
    if (showLoading) {
      dispatch(cacheActions.setLoading(false));
    }
  }
}

/**
 * Check if a region should be loaded based on cache state
 */
export function shouldLoadRegion(
  regionKey: string,
  maxDepth: number,
  getState: () => CacheState
): boolean {
  const regionMetadata = getState().regionMetadata[regionKey];
  return (
    !regionMetadata ||
    isStale(regionMetadata.loadedAt, getState().cacheConfig.maxAge) ||
    regionMetadata.maxDepth < maxDepth
  );
}

/**
 * Helper function for cache staleness checking
 */
export function isStale(lastFetched: number, maxAge: number): boolean {
  return Date.now() - lastFetched > maxAge;
}
