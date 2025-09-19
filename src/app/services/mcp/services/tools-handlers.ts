import "server-only";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import { callTrpcEndpoint } from "~/app/services/mcp/services/api-helpers";
import type { MapItem, MapItemWithHierarchy } from "~/app/services/mcp/services/hierarchy-utils";
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

// Handler for getUserMapItems tool (renamed to getItemsForRootItem)
export async function getUserMapItemsHandler(
  userId: number,
  groupId = 0,
  depth = 3,
): Promise<MapItemWithHierarchy | null> {
  if (process.env.DEBUG_MCP === "true") console.error("[MCP DEBUG] getUserMapItemsHandler called! userId:", userId);
  try {
    // Get ALL items for this user in a single API call
    // This is a public endpoint, so no authentication required
    const allItems = await callTrpcEndpoint<MapItem[]>("map.getItemsForRootItem", {
      userId,
      groupId,
    }, { requireAuth: false });

    if (!allItems || allItems.length === 0) {
      throw new Error(
        `No map found for user ${userId}. ` +
          `Make sure the user exists and has created a map.`,
      );
    }

    // Build hierarchy from the flat array
    const rootId = `${userId},${groupId}`;
    const hierarchy = buildHierarchyFromFlatArray(allItems, rootId, depth);

    if (!hierarchy) {
      throw new Error(
        `No root tile found for user ${userId} at coordinates ${rootId}.`,
      );
    }

    return hierarchy;
  } catch (error) {
    throw error;
  }
}

// Handler for getItemByCoords tool
export async function getItemByCoordsHandler(coords: {
  userId: number;
  groupId: number;
  path: number[];
}): Promise<MapItem | null> {
  try {
    const item = await _getItemByCoords(coords);
    if (!item) {
      throw new Error(
        `No tile found at coordinates ${CoordSystem.createId(coords)}. ` +
          `Make sure the coordinates are correct and the tile exists.`,
      );
    }
    return item;
  } catch (error) {
    throw error;
  }
}

// Handler for getting current user info (debug tool)
export async function getCurrentUserHandler(): Promise<unknown> {
  try {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Getting current user info`);
    const userInfo = await callTrpcEndpoint<unknown>("user.getCurrentUser", {}, { requireAuth: true });
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Current user info retrieved: ${userInfo ? 'yes' : 'no'}`);
    return userInfo;
  } catch (error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Failed to get user info: ${error instanceof Error ? error.message : 'unknown error'}`);
    throw error;
  }
}