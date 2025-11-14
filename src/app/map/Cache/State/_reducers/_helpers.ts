import type { TileData } from "~/app/map/types";
import type { MapItemAPIContract } from "~/server/api";
import { adapt } from "~/app/map/types";

export const formatItems = (items: MapItemAPIContract[]): TileData[] => {
  return items
    .map((item) => {
      try {
        return adapt(item);
      } catch {
        // Skip items that can't be adapted (malformed coordinates, etc.)
        return null;
      }
    })
    .filter((item): item is TileData => {
      if (!item) return false;
      // In the new composition system, direction 0 is a regular tile (orchestration tile)
      // We no longer filter out direction 0 - all tiles are valid
      return true;
    });
};

export const createRegionKey = (centerCoordId: string): string => {
  // Simple region key creation - can be enhanced later
  return centerCoordId;
};

export const hasDataChanges = (
  oldItems: Record<string, TileData>,
  newItems: Record<string, TileData>,
): boolean => {
  const newKeys = Object.keys(newItems);

  for (const key of newKeys) {
    const oldItem = oldItems[key];
    const newItem = newItems[key];

    if (
      !oldItem ||
      oldItem.data.title !== newItem?.data.title ||
      oldItem.data.content !== newItem?.data.content
    ) {
      return true;
    }
  }

  return false;
};
