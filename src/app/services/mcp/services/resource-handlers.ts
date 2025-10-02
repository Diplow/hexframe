import "server-only";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { callTrpcEndpoint } from "~/app/services/mcp/services/api-helpers";
import type { MapItem } from "~/app/services/mcp/services/hierarchy-utils";
import { buildHierarchyFromFlatArray } from "~/app/services/mcp/services/hierarchy-utils";

// Helper to get a map item by coordinates
async function _getItemByCoords(coords: {
  userId: number;
  groupId: number;
  path: number[];
}): Promise<MapItem | null> {
  try {
    return await callTrpcEndpoint<MapItem>("map.getItemByCoords", {
      coords,
    }, { requireAuth: false });
  } catch {
    return null;
  }
}

// Handler for map items list resource
export async function mapItemsListHandler(uri: URL, rootId: string) {
  try {
    // Parse rootId to get user info and use the efficient approach
    const coords = CoordSystem.parseId(rootId);
    // This is a public endpoint, so no authentication required
    const allItems = await callTrpcEndpoint<MapItem[]>("map.getItemsForRootItem", {
      userId: coords.userId,
      groupId: coords.groupId,
    }, { requireAuth: false });

    const hierarchy = buildHierarchyFromFlatArray(allItems, rootId, 3);

    if (!hierarchy) {
      throw new Error(
        `No map item exists at coordinate '${rootId}'. ` +
          `Coordinates are structured as 'userId,groupId' for root items ` +
          `or 'userId,groupId:direction1,direction2...' for nested items. ` +
          `To access your map, use your userId followed by ',0' (e.g., '1,0' for user 1).`,
      );
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(hierarchy, null, 2),
        },
      ],
    };
  } catch (error) {
    throw error;
  }
}

// Handler for single map item resource
export async function mapItemHandler(uri: URL, itemId: string) {
  try {
    // For single items, use the simple getItemByCoords approach
    const coords = CoordSystem.parseId(itemId);
    const item = await _getItemByCoords(coords);

    if (!item) {
      throw new Error(
        `No map item exists at coordinate '${itemId}'. ` +
          `Coordinates are structured as 'userId,groupId' for root items ` +
          `or 'userId,groupId:direction1,direction2...' for nested items. ` +
          `To access your map, use your userId followed by ',0' (e.g., '1,0' for user 1).`,
      );
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify(item, null, 2),
        },
      ],
    };
  } catch (error) {
    throw error;
  }
}