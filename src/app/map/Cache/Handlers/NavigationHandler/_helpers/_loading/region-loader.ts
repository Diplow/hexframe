import type { Dispatch } from "react";
import type { CacheAction } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services";
import type { MapItemType } from "~/lib/domains/mapping/utils";
import { loggers } from "~/lib/debug/debug-logger";

/**
 * Load full region around a coordinate with fallback to root item only
 */
export async function loadRegionForItem(
  loadedItem: {
    id: string;
    coordinates: string;
    depth: number;
    title: string;
    content: string;
    preview: string | undefined;
    link: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
    originId: string | null;
  },
  serverService: ServerService,
  dispatch: Dispatch<CacheAction>
): Promise<void> {
  const loadedCoordId = loadedItem.coordinates;

  try {
    const fullRegionItems = await serverService.fetchItemsForCoordinate({
      centerCoordId: loadedCoordId,
      maxDepth: 2
    });

    dispatch(cacheActions.loadRegion(fullRegionItems as Parameters<typeof cacheActions.loadRegion>[0], loadedCoordId, 2));

    loggers.mapCache.handlers(`✅ Loaded full region with ${fullRegionItems.length} items`, {
      centerCoordId: loadedCoordId,
      itemCount: fullRegionItems.length
    });
  } catch (error) {
    dispatch(cacheActions.loadRegion([loadedItem], loadedCoordId, 0));

    loggers.mapCache.handlers(`⚠️ Failed to load full region, loaded root item only`, {
      centerCoordId: loadedCoordId,
      error
    });
  }
}
