import type { Dispatch } from "react";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services/types";
import { checkAncestors, loadAncestorsForItem } from "~/app/map/Cache/Handlers";

// Type for items returned by ServerService
type ServerItem = Awaited<ReturnType<ServerService['fetchItemsForCoordinate']>>[0];

/**
 * Core prefetch operation logic
 */
export async function executePrefetchRegion(
  centerCoordId: string,
  maxDepth: number,
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService,
  loadingCenters: Set<string>
): Promise<void> {
  // Prevent concurrent loads for the same center
  if (loadingCenters.has(centerCoordId)) {
    return;
  }

  try {
    loadingCenters.add(centerCoordId);
    
    // Set loading state before fetching
    dispatch(cacheActions.setLoading(true));
    
    const items = await serverService.fetchItemsForCoordinate({
      centerCoordId,
      maxDepth,
    });

    // Items fetched successfully
    dispatch(
      cacheActions.loadRegion(
        items as Parameters<typeof cacheActions.loadRegion>[0],
        centerCoordId,
        maxDepth,
      ),
    );
    
    // Clear loading state after successful load
    dispatch(cacheActions.setLoading(false));
    
    // Handle ancestor loading if needed
    await handleAncestorLoading(centerCoordId, items, dispatch, serverService);
  } catch (error) {
    console.error('[MapCache] Failed to load region:', error);
    dispatch(cacheActions.setError(error as Error));
    dispatch(cacheActions.setLoading(false));
  } finally {
    loadingCenters.delete(centerCoordId);
  }
}

/**
 * Handle ancestor loading for sub-tiles
 */
async function handleAncestorLoading(
  centerCoordId: string,
  items: ServerItem[],
  dispatch: Dispatch<CacheAction>,
  serverService: ServerService
): Promise<void> {
  // Check if ancestors need to be loaded for the center item
  const centerItem = items.find(item => item.coordinates === centerCoordId);
  if (!centerItem?.coordinates?.includes(':')) {
    return; // Not a sub-tile
  }

  // This is a sub-tile, check if we need to load ancestors
  const { hasAllAncestors } = checkAncestors(centerCoordId, items);

  // Load ancestors if missing
  if (!hasAllAncestors && centerItem.id) {
    const centerDbId = parseInt(centerItem.id);
    if (!isNaN(centerDbId)) {
      void loadAncestorsForItem(centerDbId, serverService, dispatch, "Initial Load");
    }
  }
}