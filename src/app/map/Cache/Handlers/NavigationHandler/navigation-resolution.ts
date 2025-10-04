import type { CacheAction, CacheState } from "~/app/map/Cache/State";
import { cacheActions } from "~/app/map/Cache/State";
import type { ServerService } from "~/app/map/Cache/Services";
import type { TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";
import { logResolutionResult } from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/resolution-logger";
import { convertToTileData } from "~/app/map/Cache/Handlers/NavigationHandler/_helpers/tile-converter";

/**
 * Resolve item identifier to find existing item and coordinate ID
 */
export function resolveItemIdentifier(
  itemIdentifier: string,
  getState: () => CacheState
): { existingItem: TileData | undefined; resolvedCoordId: string | undefined } {
  const allItems = Object.values(getState().itemsById);
  const isCoordinateId = itemIdentifier.includes(',') || itemIdentifier.includes(':');

  let existingItem: TileData | undefined;
  let resolvedCoordId: string | undefined;

  if (isCoordinateId) {
    loggers.mapCache.handlers('[Navigation] 🗺️ Identifier appears to be a coordinate ID');
    existingItem = getState().itemsById[itemIdentifier];
    resolvedCoordId = itemIdentifier;
  } else {
    loggers.mapCache.handlers('[Navigation] 🏷️ Identifier appears to be a database ID');
    existingItem = allItems.find(item => String(item.metadata.dbId) === itemIdentifier);
    resolvedCoordId = existingItem?.metadata.coordId;
  }

  logResolutionResult(existingItem, itemIdentifier, isCoordinateId, allItems);

  return { existingItem, resolvedCoordId };
}

/**
 * Load siblings for an item by fetching its parent with 1 generation of children
 */
export async function loadSiblingsForItem(
  parentCoordId: string,
  serverService: ServerService,
  dispatch: React.Dispatch<CacheAction>
): Promise<void> {
  try {
    const parentWithChildren = await serverService.getItemWithGenerations({
      coordId: parentCoordId,
      generations: 1
    });

    if (parentWithChildren.length > 0) {
      const siblingItems: Record<string, TileData> = {};

      parentWithChildren.forEach(item => {
        const tileData = convertToTileData(item);
        siblingItems[tileData.metadata.coordId] = tileData;
      });

      dispatch(cacheActions.updateItems(siblingItems));
    }
  } catch (error) {
    console.error('[NAV] Failed to load siblings:', error);
  }
}
