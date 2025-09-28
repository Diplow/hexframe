import { CoordSystem } from "~/lib/domains/mapping/utils";
import { callTrpcEndpoint } from "~/app/services/mcp/services/api-helpers";
import type { MapItem } from "~/app/services/mcp/services/hierarchy-utils";

// Re-export resource handlers
export { mapItemsListHandler, mapItemHandler } from "~/app/services/mcp/services/resource-handlers";

// Re-export tools handlers
export { getUserMapItemsHandler, getItemByCoordsHandler, getCurrentUserHandler } from "~/app/services/mcp/services/tools-handlers";


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




// Handler for addItem tool
export async function addItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
  title: string,
  descr?: string,
  preview?: string,
  url?: string,
): Promise<MapItem> {
  console.log("[PREVIEW DEBUG] MCP addItemHandler called! Preview value:", preview, "Type:", typeof preview);
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
      const parentItem = await _getItemByCoords(parentCoords);
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
    const newItem = await callTrpcEndpoint<MapItem>("map.addItem", {
      coords,
      parentId,
      title,
      descr,
      preview,
      url,
    }, { requireAuth: true });
    console.log("[PREVIEW DEBUG] map.addItem returned item with id:", newItem?.id, "preview:", newItem?.preview);

    return newItem;
  } catch (error) {
    throw error;
  }
}


// Handler for updateItem tool
export async function updateItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
  updates: { title?: string; descr?: string; preview?: string; url?: string },
): Promise<MapItem> {
  try {
    const updatedItem = await callTrpcEndpoint<MapItem>("map.updateItem", {
      coords,
      data: updates,
    }, { requireAuth: true });

    return updatedItem;
  } catch (error) {
    throw error;
  }
}

// Handler for deleteItem tool
export async function deleteItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
): Promise<{ success: true }> {
  try {
    const result = await callTrpcEndpoint<{ success: true }>("map.removeItem", {
      coords,
    }, { requireAuth: true });

    return result;
  } catch (error) {
    throw error;
  }
}

// Handler for moveItem tool
export async function moveItemHandler(
  oldCoords: { userId: number; groupId: number; path: number[] },
  newCoords: { userId: number; groupId: number; path: number[] },
): Promise<{
  modifiedItems: MapItem[];
  movedItemId: string;
  affectedCount: number;
}> {
  try {
    const result = await callTrpcEndpoint<{
      modifiedItems: MapItem[];
      movedItemId: string;
      affectedCount: number;
    }>("map.moveMapItem", {
      oldCoords,
      newCoords,
    }, { requireAuth: true });

    return result;
  } catch (error) {
    throw error;
  }
}
