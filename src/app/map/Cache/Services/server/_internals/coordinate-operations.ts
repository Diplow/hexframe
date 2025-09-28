import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { api } from "~/commons/trpc/react";
import { withRetry } from "~/app/map/Cache/Services/server/server-retry-utils";
import type { ServiceConfig } from "~/app/map/Cache/Services/types";
import { withErrorTransform } from "~/app/map/Cache/Services/server/server-operations";
import type { MapItemType } from "~/lib/domains/mapping/interface.client";

/**
 * Create coordinate-based query operations
 */
export function createCoordinateOperations(
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) {
  const fetchItemsForCoordinate = async (params: {
    centerCoordId: string;
    maxDepth: number;
  }): Promise<Array<{
    id: string;
    coordinates: string;
    depth: number;
    name: string;
    descr: string;
    url: string;
    parentId: string | null;
    itemType: MapItemType;
    ownerId: string;
  }>> => {
    const operation = async (): Promise<Array<{
      id: string;
      coordinates: string;
      depth: number;
      name: string;
      descr: string;
      url: string;
      parentId: string | null;
      itemType: MapItemType;
      ownerId: string;
    }>> => {
      // Parse the coordinate to get user and group information
      // Now we only receive proper coordinates, never mapItemIds
      let coords;
      try {
        coords = CoordSystem.parseId(params.centerCoordId);
      } catch (_error) {
        console.warn('Invalid coordinate ID:', _error);
        return [];
      }
      
      // Don't make API calls with invalid userId/groupId values
      if (coords.userId === 0 || isNaN(coords.userId)) {
        console.warn('[ServerService] Skipping API call due to invalid coordinate parsing:', {
          centerCoordId: params.centerCoordId,
          parsedCoords: coords,
          issue: isNaN(coords.userId) ? 'NaN userId (likely database ID format)' : 'Zero userId'
        });
        return [];
      }
      
      // If this is a specific item (has a path), fetch it with limited generations
      if (coords.path && coords.path.length > 0) {
        // Use the enhanced endpoint with generations parameter if generations > 0
        if (params.maxDepth > 0) {
          const result = await utils.map.getItemByCoords.fetch({
            coords: {
              userId: coords.userId,
              groupId: coords.groupId,
              path: coords.path,
            },
            generations: params.maxDepth,
          });
          // The enhanced endpoint returns an array when generations > 0
          // Properly flatten mixed array: some items might be objects, some might be arrays
          if (Array.isArray(result)) {
            const flattened = result.flatMap(item => Array.isArray(item) ? item : [item]);
            return flattened as Array<{
              id: string;
              coordinates: string;
              depth: number;
              name: string;
              descr: string;
              url: string;
              parentId: string | null;
              itemType: MapItemType;
              ownerId: string;
            }>;
          }
          return [result] as Array<{
            id: string;
            coordinates: string;
            depth: number;
            name: string;
            descr: string;
            url: string;
            parentId: string | null;
            itemType: MapItemType;
            ownerId: string;
          }>;
        } else {
          // Get just the center item for maxDepth = 0
          const centerItem = await utils.map.getItemByCoords.fetch({
            coords: {
              userId: coords.userId,
              groupId: coords.groupId,
              path: coords.path,
            },
          });
          return centerItem ? [centerItem] as Array<{
            id: string;
            coordinates: string;
            depth: number;
            name: string;
            descr: string;
            url: string;
            parentId: string | null;
            itemType: MapItemType;
            ownerId: string;
          }> : [];
        }
      } else {
        // For root-level queries with proper coordinate format (e.g., "10,0:")
        // Fetch all items for this root
        const items = await utils.map.getItemsForRootItem.fetch({
          userId: coords.userId,
          groupId: coords.groupId,
        });
        // Properly flatten mixed array: some items might be objects, some might be arrays
        if (Array.isArray(items)) {
          const flattened = items.flatMap(item => Array.isArray(item) ? item : [item]);
          return flattened as Array<{
            id: string;
            coordinates: string;
            depth: number;
            name: string;
            descr: string;
            url: string;
            parentId: string | null;
            itemType: MapItemType;
            ownerId: string;
          }>;
        }
        return [items] as Array<{
          id: string;
          coordinates: string;
          depth: number;
          name: string;
          descr: string;
          url: string;
          parentId: string | null;
          itemType: MapItemType;
          ownerId: string;
        }>;
      }
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  const getItemByCoordinate = async (coordId: string) => {
    const operation = async () => {
      const coords = CoordSystem.parseId(coordId);
      const item = await utils.map.getItemByCoords.fetch({
        coords: coords,
      });
      // If the API returns an array, take the first item, otherwise return the item or null
      if (Array.isArray(item)) {
        return item[0] ?? null;
      }
      return item;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  const getItemWithGenerations = async (params: {
    coordId: string;
    generations: number;
  }) => {
    const operation = async (): Promise<Array<{
      id: string;
      coordinates: string;
      depth: number;
      name: string;
      descr: string;
      url: string;
      parentId: string | null;
      itemType: MapItemType;
      ownerId: string;
    }>> => {
      const coords = CoordSystem.parseId(params.coordId);
      const items = await utils.map.getItemByCoords.fetch({
        coords: coords,
        generations: params.generations,
      });
      // Properly flatten mixed array: some items might be objects, some might be arrays
      if (Array.isArray(items)) {
        const flattened = items.flatMap(item => Array.isArray(item) ? item : [item]);
        return flattened as Array<{
          id: string;
          coordinates: string;
          depth: number;
          name: string;
          descr: string;
          url: string;
          parentId: string | null;
          itemType: MapItemType;
          ownerId: string;
        }>;
      }
      return [items] as Array<{
        id: string;
        coordinates: string;
        depth: number;
        name: string;
        descr: string;
        url: string;
        parentId: string | null;
        itemType: MapItemType;
        ownerId: string;
      }>;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  };

  return {
    fetchItemsForCoordinate,
    getItemByCoordinate,
    getItemWithGenerations,
  };
}