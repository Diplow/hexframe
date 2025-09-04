import { CoordSystem } from "~/lib/domains/mapping/utils";

interface MapItem {
  id: string;
  coordinates: string;
  depth: number;
  name: string;
  descr: string | null;
  url: string | null;
  parentId: string | null;
  itemType: string;
  ownerId: string;
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

// Helper to build hierarchical structure from flat array of items
function buildHierarchyFromFlatArray(
  items: MapItem[],
  rootCoordId: string,
  depth = 3,
): MapItemWithHierarchy | null {
  // Create a lookup map for efficient access
  const itemsByCoordId = new Map<string, MapItem>();
  items.forEach(item => {
    itemsByCoordId.set(item.coordinates, item);
  });

  // Find the root item
  const rootItem = itemsByCoordId.get(rootCoordId);
  if (!rootItem) return null;

  // Recursive function to build hierarchy
  function buildNode(coordId: string, currentDepth: number): MapItemWithHierarchy | null {
    const item = itemsByCoordId.get(coordId);
    if (!item) return null;

    const node: MapItemWithHierarchy = { ...item };

    // Add children if within depth limit
    if (currentDepth < depth) {
      const children: MapItemWithHierarchy[] = [];

      // Find direct children from the flat array
      for (const candidateItem of items) {
        // Skip self
        if (candidateItem.coordinates === coordId) continue;
        
        // Check if this item is a direct child (descendant with exactly one level deeper)
        if (CoordSystem.isDescendant(candidateItem.coordinates, coordId)) {
          const candidateDepth = CoordSystem.getDepthFromId(candidateItem.coordinates);
          const currentItemDepth = CoordSystem.getDepthFromId(coordId);
          
          // Only include direct children (exactly one level deeper)
          if (candidateDepth === currentItemDepth + 1) {
            const childNode = buildNode(candidateItem.coordinates, currentDepth + 1);
            if (childNode) {
              children.push(childNode);
            }
          }
        }
      }

      if (children.length > 0) {
        node.children = children;
      }
    }

    return node;
  }

  return buildNode(rootCoordId, 0);
}

// Handler for map items list resource  
export async function mapItemsListHandler(uri: URL, rootId: string) {
  try {
    // Parse rootId to get user info and use the efficient approach
    const coords = CoordSystem.parseId(rootId);
    const allItems = await callTrpcEndpoint<MapItem[]>("map.getItemsForRootItem", {
      userId: coords.userId,
      groupId: coords.groupId,
    });

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
    const item = await getItemByCoords(coords);

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

// Handler for getUserMapItems tool (renamed to getItemsForRootItem)
export async function getUserMapItemsHandler(
  userId: number,
  groupId = 0,
  depth = 3,
): Promise<MapItemWithHierarchy | null> {
  try {
    // Get ALL items for this user in a single API call
    const allItems = await callTrpcEndpoint<MapItem[]>("map.getItemsForRootItem", {
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
    const item = await getItemByCoords(coords);
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

// Handler for addItem tool
export async function addItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
  title: string,
  descr?: string,
  url?: string,
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
      
      const parentItem = await getItemByCoords(parentCoords);
      if (!parentItem) {
        throw new Error(
          `Parent tile not found at coordinates ${CoordSystem.createId(parentCoords)}. ` +
            `Create the parent tile first.`,
        );
      }
      parentId = parseInt(parentItem.id, 10);
    }

    const newItem = await callTrpcEndpoint<MapItem>("map.addItem", {
      coords,
      parentId,
      title,
      descr: descr ?? null,
      url: url ?? null,
    });

    return newItem;
  } catch (error) {
    throw error;
  }
}

// Handler for updateItem tool
export async function updateItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
  updates: { title?: string; descr?: string; url?: string },
): Promise<MapItem> {
  try {
    const updatedItem = await callTrpcEndpoint<MapItem>("map.updateItem", {
      coords,
      data: {
        title: updates.title,
        descr: updates.descr,
        url: updates.url,
      },
    });

    return updatedItem;
  } catch (error) {
    throw error;
  }
}
