import type { api } from "~/commons/trpc/react";
import type { Coord } from "~/lib/domains/mapping/utils";
import { _flattenMixedResult, type FetchedMapItem } from "~/app/map/Cache/Services/server/_internals/_result-flattening";

/**
 * Fetches a specific item (with path) and optionally its descendants
 */
export async function _fetchSpecificItemWithGenerations(
  utils: ReturnType<typeof api.useUtils>,
  coords: Coord,
  maxDepth: number
): Promise<FetchedMapItem[]> {
  // maxDepth > 0: fetch item with generations
  if (maxDepth > 0) {
    const result = await utils.map.getItemByCoords.fetch({
      coords: {
        userId: coords.userId,
        groupId: coords.groupId,
        path: coords.path,
      },
      generations: maxDepth,
    });
    return _flattenMixedResult(result);
  }

  // maxDepth === 0: fetch only the center item
  const centerItem = await utils.map.getItemByCoords.fetch({
    coords: {
      userId: coords.userId,
      groupId: coords.groupId,
      path: coords.path,
    },
  });

  return centerItem ? [centerItem as FetchedMapItem] : [];
}

/**
 * Fetches all items for a root-level coordinate (no path)
 */
export async function _fetchRootItems(
  utils: ReturnType<typeof api.useUtils>,
  coords: Coord
): Promise<FetchedMapItem[]> {
  const items = await utils.map.getItemsForRootItem.fetch({
    userId: coords.userId,
    groupId: coords.groupId,
  });

  return _flattenMixedResult(items);
}
