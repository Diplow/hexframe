import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { api } from "~/commons/trpc/react";
import { withRetry } from "./server-retry-utils";
import type { ServiceConfig } from "../types";
import { withErrorTransform } from "./server-operations";

// Create query operations for the server service
export const createQueryOperations = (
  utils: ReturnType<typeof api.useUtils>,
  finalConfig: Required<ServiceConfig>
) => ({
  fetchItemsForCoordinate: async (params: {
    centerCoordId: string;
    maxDepth: number;
  }) => {
    // fetchItemsForCoordinate called
    const operation = async () => {
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
      
      // Fetching for coordinate

      // If this is a specific item (has a path), fetch it and its descendants
      if (coords.path && coords.path.length > 0) {
        // First get the specific item
        const centerItem = await utils.map.getItemByCoords.fetch({
          coords: {
            userId: coords.userId,
            groupId: coords.groupId,
            path: coords.path,
          },
        });

        // Then get its descendants if it exists
        if (centerItem?.id) {
          const descendants = await utils.map.getDescendants.fetch({
            itemId: parseInt(centerItem.id),
          });
          
          // Return the center item plus its descendants
          return [centerItem, ...descendants];
        }
        
        return centerItem ? [centerItem] : [];
      } else {
        // For root-level queries with proper coordinate format (e.g., "10,0:")
        // Fetch all items for this root
        const items = await utils.map.getItemsForRootItem.fetch({
          userId: coords.userId,
          groupId: coords.groupId,
        });
        // Items fetched for root coordinate
        return items;
      }
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  },

  // Additional helper methods using the available tRPC APIs (queries only)
  getItemByCoordinate: async (coordId: string) => {
    // getItemByCoordinate called
    const operation = async () => {
      const coords = CoordSystem.parseId(coordId);
      const item = await utils.map.getItemByCoords.fetch({
        coords: coords,
      });
      return item;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  },

  getRootItemById: async (mapItemId: number) => {
    // getRootItemById called
    const operation = async () => {
      const item = await utils.map.getRootItemById.fetch({ mapItemId });
      return item;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  },

  getDescendants: async (itemId: number) => {
    // getDescendants called
    const operation = async () => {
      const descendants = await utils.map.getDescendants.fetch({ itemId });
      return descendants;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  },

  getAncestors: async (itemId: number) => {
    // getAncestors called
    const operation = async () => {
      const ancestors = await utils.map.getAncestors.fetch({ itemId });
      return ancestors;
    };

    return finalConfig.enableRetry
      ? withRetry(() => withErrorTransform(operation, finalConfig), finalConfig)
      : withErrorTransform(operation, finalConfig);
  },
});