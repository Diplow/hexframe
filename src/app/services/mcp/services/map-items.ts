import type { NonUserMapItemTypeString, VisibilityString } from "~/lib/domains/mapping/utils";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { MapItem } from "~/app/services/mcp/services/hierarchy-utils";
import type { AppRouter } from '~/server/api';

// Type for tRPC caller
type TRPCCaller = ReturnType<AppRouter['createCaller']>;

// Re-export resource handlers
export { mapItemsListHandler, mapItemHandler } from "~/app/services/mcp/services/resource-handlers";

// Re-export tools handlers
export { getUserMapItemsHandler, getItemByCoordsHandler, getCurrentUserHandler } from "~/app/services/mcp/services/tools-handlers";


// Helper to get a map item by coordinates
async function _getItemByCoords(
  caller: TRPCCaller,
  coords: {
    userId: string;
    groupId: number;
    path: number[];
  }
): Promise<MapItem | null> {
  try {
    const result = await caller.map.getItemByCoords({ coords });
    // Handle potential array return (shouldn't happen but type safety)
    return Array.isArray(result) ? result[0] ?? null : result;
  } catch {
    return null;
  }
}




// Handler for addItem tool
export async function addItemHandler(
  caller: TRPCCaller,
  coords: { userId: string; groupId: number; path: number[] },
  title: string,
  itemType: NonUserMapItemTypeString,
  content?: string,
  preview?: string,
  url?: string,
  visibility?: VisibilityString,
): Promise<MapItem> {
  try {
    // For creation, we need parentId if it's not a root item
    let parentId: number | null = null;

    if (coords.path.length > 0) {
      // Get parent coordinates
      const parentCoords = {
        userId: coords.userId,
        groupId: coords.groupId,
        path: coords.path.slice(0, -1)
      };

      if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Looking for parent at coords:`, parentCoords);
      const parentItem = await _getItemByCoords(caller, parentCoords);
      if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Parent item found: ${parentItem ? 'yes' : 'no'}`);
      if (!parentItem) {
        throw new Error(
          `Parent tile not found at coordinates ${CoordSystem.createId(parentCoords)}. ` +
            `Create the parent tile first.`,
        );
      }
      parentId = parseInt(parentItem.id, 10);
      if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Parent ID:`, parentId);
    }

    if (!title || title.trim().length === 0) {
      throw new Error("title must be a non-empty string");
    }
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] About to call map.addItem with parentId: ${parentId}, title length: ${title.length}`);
    const newItem = await caller.map.addItem({
      coords,
      parentId,
      title,
      content,
      preview,
      link: url, // API uses 'link' not 'url'
      visibility,
      itemType,
    });

    return newItem;
  } catch (error) {
    throw error;
  }
}


// Handler for updateItem tool
export async function updateItemHandler(
  caller: TRPCCaller,
  coords: { userId: string; groupId: number; path: number[] },
  updates: { title?: string; content?: string; preview?: string; url?: string; visibility?: VisibilityString; itemType?: NonUserMapItemTypeString },
): Promise<MapItem> {
  try {
    // Convert url to link if present
    const { url, ...rest } = updates;
    const dataWithLink = url ? { ...rest, link: url } : rest;

    const updatedItem = await caller.map.updateItem({
      coords,
      data: dataWithLink,
    });

    return updatedItem;
  } catch (error) {
    throw error;
  }
}

// Handler for deleteItem tool
export async function deleteItemHandler(
  caller: TRPCCaller,
  coords: { userId: string; groupId: number; path: number[] },
): Promise<{ success: true }> {
  try {
    const result = await caller.map.removeItem({
      coords,
    });

    return result;
  } catch (error) {
    throw error;
  }
}

// Handler for moveItem tool
export async function moveItemHandler(
  caller: TRPCCaller,
  oldCoords: { userId: string; groupId: number; path: number[] },
  newCoords: { userId: string; groupId: number; path: number[] },
): Promise<{
  modifiedItems: MapItem[];
  movedItemId: string;
  affectedCount: number;
}> {
  try {
    const result = await caller.map.moveMapItem({
      oldCoords,
      newCoords,
    });

    return result;
  } catch (error) {
    throw error;
  }
}
