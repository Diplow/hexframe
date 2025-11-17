import "server-only";
import { CoordSystem } from "~/lib/domains/mapping/utils";
import type { MapItem, MapItemWithHierarchy } from "~/app/services/mcp/services/hierarchy-utils";
import { buildHierarchyFromFlatArray } from "~/app/services/mcp/services/hierarchy-utils";
import type { AppRouter } from '~/server/api';

// Type for tRPC caller
type TRPCCaller = ReturnType<AppRouter['createCaller']>;

// Helper function to filter fields from an object
function filterFields<T extends Record<string, unknown>>(item: T, fields?: string[]): Partial<T> {
  if (!fields || fields.length === 0) {
    return item;
  }

  const filtered: Partial<T> = {};
  for (const field of fields) {
    if (field in item) {
      filtered[field as keyof T] = item[field as keyof T];
    }
  }
  return filtered;
}

// Helper function to recursively filter hierarchy fields
function filterHierarchyFields(item: MapItemWithHierarchy, fields?: string[]): Partial<MapItemWithHierarchy> {
  const filtered = filterFields(item, fields);

  if (item.children && (!fields || fields.includes('children'))) {
    filtered.children = item.children.map(child => filterHierarchyFields(child, fields)) as MapItemWithHierarchy[];
  }

  return filtered;
}

// Helper to get a map item by coordinates
async function _getItemByCoords(
  caller: TRPCCaller,
  coords: {
    userId: number;
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

// Handler for getUserMapItems tool (renamed to getItemsForRootItem)
export async function getUserMapItemsHandler(
  caller: TRPCCaller,
  userId: number,
  groupId = 0,
  depth = 3,
  fields?: string[],
): Promise<Partial<MapItemWithHierarchy> | null> {
  if (process.env.DEBUG_MCP === "true") console.error("[MCP DEBUG] getUserMapItemsHandler called! userId:", userId);
  try {
    // Get ALL items for this user via direct tRPC call
    const allItems = await caller.map.getItemsForRootItem({
      userId,
      groupId,
    });

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

    // Apply field filtering if requested
    return filterHierarchyFields(hierarchy, fields);
  } catch (error) {
    throw error;
  }
}

// Handler for getItemByCoords tool
export async function getItemByCoordsHandler(
  caller: TRPCCaller,
  coords: {
    userId: number;
    groupId: number;
    path: number[];
  },
  fields?: string[]
): Promise<Partial<MapItem> | null> {
  try {
    const item = await _getItemByCoords(caller, coords);
    if (!item) {
      throw new Error(
        `No tile found at coordinates ${CoordSystem.createId(coords)}. ` +
          `Make sure the coordinates are correct and the tile exists.`,
      );
    }

    // Apply field filtering if requested
    return filterFields(item, fields);
  } catch (error) {
    throw error;
  }
}

// Handler for getting current user info (debug tool)
export async function getCurrentUserHandler(caller: TRPCCaller): Promise<unknown> {
  try {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Getting current user info`);
    const userInfo = await caller.user.getCurrentUser();
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Current user info retrieved: ${userInfo ? 'yes' : 'no'}`);
    return userInfo;
  } catch (error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Failed to get user info: ${error instanceof Error ? error.message : 'unknown error'}`);
    throw error;
  }
}