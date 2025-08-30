import { CoordSystem } from "~/lib/domains/mapping/utils";

interface MapItem {
  id: number;
  coords: {
    userId: number;
    groupId: number;
    path: number[];
  };
  parentId: number | null;
  title: string;
  descr: string | null;
  canExpand: boolean;
  depth: number;
  rootId: number;
  url: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MapItemWithHierarchy extends MapItem {
  children?: MapItemWithHierarchy[];
  parent?: MapItem | null;
}

// Get the base URL for API calls
function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_VERCEL_URL;
  if (!url) return "http://localhost:3000";

  // For localhost URLs, use http instead of https
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    return `http://${url}`;
  }

  return `https://${url}`;
}

// Helper to call tRPC endpoints
async function callTrpcEndpoint<T>(
  endpoint: string,
  input: unknown,
): Promise<T> {
  const baseUrl = getApiBaseUrl();

  // tRPC batch format for GET requests
  const params = new URLSearchParams({
    batch: "1",
    input: JSON.stringify({ "0": { json: input } }),
  });

  const url = `${baseUrl}/services/api/trpc/${endpoint}?${params}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.statusText}`);
  }

  // tRPC batch response format
  const data = (await response.json()) as Array<{
    result?: { data: { json: T } };
    error?: { message?: string };
  }>;

  // Get first item from batch response
  const item = data[0];
  if (!item) {
    throw new Error("Empty API response");
  }

  if (item.error) {
    throw new Error(item.error.message ?? "API error");
  }

  if (!item.result) {
    throw new Error("Invalid API response");
  }

  return item.result.data.json;
}

// Helper to get a map item by coordinates
async function getItemByCoords(coords: {
  userId: number;
  groupId: number;
  path: number[];
}): Promise<MapItem | null> {
  try {
    return await callTrpcEndpoint<MapItem>("map.getItemByCoords", {
      coords,
    });
  } catch {
    // Return null for missing items (expected behavior)
    return null;
  }
}

// Helper to build hierarchical structure from a root item
async function buildHierarchy(
  rootId: string,
  depth = 3,
): Promise<MapItemWithHierarchy | null> {
  try {
    // Parse the coordId to get coordinates
    const rootCoords = CoordSystem.parseId(rootId);

    // Get the root item
    const rootItem = await getItemByCoords(rootCoords);
    if (!rootItem) return null;

    // Build hierarchical structure
    const hierarchy: MapItemWithHierarchy = { ...rootItem };

    // Get children if depth allows
    if (depth > 0 && rootItem.canExpand) {
      const childCoordIds = CoordSystem.getChildCoordsFromId(rootId);
      const children = await Promise.all(
        childCoordIds.map(async (childId) => {
          // Recursively build hierarchy for children
          const childHierarchy = await buildHierarchy(childId, depth - 1);
          return childHierarchy;
        }),
      );

      hierarchy.children = children.filter(
        (child): child is MapItemWithHierarchy => child !== null,
      );
    }

    // Get parent if exists
    const parentId = CoordSystem.getParentCoordFromId(rootId);
    if (parentId) {
      const parentCoords = CoordSystem.parseId(parentId);
      hierarchy.parent = await getItemByCoords(parentCoords);
    }

    return hierarchy;
  } catch {
    // Return null if hierarchy can't be built
    return null;
  }
}

// Handler for map items list resource
export async function mapItemsListHandler(uri: URL, rootId: string) {
  try {
    // Build hierarchical structure from root
    const hierarchy = await buildHierarchy(rootId);

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
    // Get the item with minimal hierarchy (just parent and direct children)
    const hierarchy = await buildHierarchy(itemId, 1);

    if (!hierarchy) {
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
          text: JSON.stringify(hierarchy, null, 2),
        },
      ],
    };
  } catch (error) {
    throw error;
  }
}

// Handler for getUserMapItems tool
export async function getUserMapItemsHandler(
  userId: number,
  groupId = 0,
  depth = 3,
): Promise<MapItemWithHierarchy | null> {
  try {
    // Construct the root coordinate ID for the user
    const rootId = `${userId},${groupId}`;

    // Build the hierarchy starting from the user's root
    const hierarchy = await buildHierarchy(rootId, depth);

    if (!hierarchy) {
      throw new Error(
        `No map found for user ${userId}. ` +
          `Make sure the user exists and has created a map.`,
      );
    }

    return hierarchy;
  } catch (error) {
    throw error;
  }
}
