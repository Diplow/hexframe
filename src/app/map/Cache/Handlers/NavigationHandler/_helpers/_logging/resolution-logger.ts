import type { TileData } from "~/app/map/types";
import { loggers } from "~/lib/debug/debug-logger";

/**
 * Log resolution result for debugging
 */
export function logResolutionResult(
  existingItem: TileData | undefined,
  itemIdentifier: string,
  isCoordinateId: boolean,
  allItems: TileData[]
): void {
  if (existingItem) {
    const idType = isCoordinateId ? 'coordinate ID' : 'database ID';
    loggers.mapCache.handlers(`[Navigation] ✅ Found item by ${idType}:`, {
      coordId: existingItem.metadata.coordId,
      dbId: existingItem.metadata.dbId,
      title: existingItem.data.title
    });
  } else {
    loggers.mapCache.handlers(`❌ No item found with identifier: ${itemIdentifier}`, {
      availableItems: allItems.map((item, index) => ({
        index: index + 1,
        dbId: item.metadata.dbId,
        dbIdType: typeof item.metadata.dbId,
        coordId: item.metadata.coordId,
        title: item.data.title
      })),
      lookingForId: itemIdentifier,
      lookingForIdType: typeof itemIdentifier
    });
  }
}
