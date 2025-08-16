import "server-only";

import { api } from "~/commons/trpc/server";
import { CoordSystem } from "~/lib/domains/mapping/interface.client";
import type { ServiceConfig } from "./types";

/**
 * Static server service for server-side usage (SSR, server actions, etc.)
 * This version doesn't use React hooks and can be used in server contexts.
 */
export const createStaticServerService = (_config: ServiceConfig = {}) => {
  return {
    async fetchItemsForCoordinate(params: {
      centerCoordId: string;
      maxDepth: number;
    }) {
      // Parse the coordinate to get user and group information
      // Now we only receive proper coordinates, never mapItemIds
      const coords = CoordSystem.parseId(params.centerCoordId);
      
      // Fetching for coordinate
      
      // If this is a specific item (has a path), fetch it and its descendants
      if (coords.path && coords.path.length > 0) {
        try {
          // First get the specific item
          const centerItem = await api.map.getItemByCoords({
            coords: {
              userId: coords.userId,
              groupId: coords.groupId,
              path: coords.path,
            },
          });

          // Then get its descendants if it exists
          if (centerItem?.id) {
            const descendants = await api.map.getDescendants({
              itemId: parseInt(centerItem.id),
            });
            
            // Return the center item plus its descendants
            return [centerItem, ...descendants];
          }
          
          // Fallback if no descendants
          return centerItem ? [centerItem] : [];
        } catch (error) {
          console.error('[StaticServerService] Failed to fetch items:', error);
          return [];
        }
      } else {
        // For root-level queries with proper coordinate format (e.g., "10,0:")
        // Fetch all items for this root
        try {
          const items = await api.map.getItemsForRootItem({
            userId: coords.userId,
            groupId: coords.groupId,
          });
          // Items fetched for root coordinate
          return items;
        } catch (error) {
          console.error('[StaticServerService] Failed to fetch items:', error);
          return [];
        }
      }
    },
  };
};