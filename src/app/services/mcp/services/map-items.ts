import { CoordSystem } from "~/lib/domains/mapping/utils";
import { getApiKey } from "~/lib/utils/request-context";

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
  const explicit = process.env.HEXFRAME_API_BASE_URL ?? process.env.BETTER_AUTH_URL ?? process.env.VERCEL_URL;
  if (!explicit) return "http://localhost:3000";
  const url = explicit.replace(/^https?:\/\//, "");
  const isLocal = url.includes("localhost") || url.includes("127.0.0.1");
  return `${isLocal ? "http" : "https"}://${url}`;
}

// Helper to call tRPC endpoints
async function callTrpcEndpoint<T>(
  endpoint: string,
  input: unknown,
  options: { requireAuth?: boolean; method?: "GET" | "POST" } = {},
): Promise<T> {
  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] callTrpcEndpoint: ${endpoint}`, { requireAuth: options.requireAuth, method: options.method });

  try {
    const baseUrl = getApiBaseUrl();
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Base URL: ${baseUrl}`);

  // tRPC batch format for GET requests
  const params = new URLSearchParams({
    batch: "1",
    input: JSON.stringify({ "0": { json: input } }),
  });

  const url = `${baseUrl}/services/api/trpc/${endpoint}?${params}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add API key for authenticated operations
  if (options.requireAuth) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API key is required for authenticated operations. Ensure request is running within authenticated context.");
    }
    // Never log API keys
    headers["x-api-key"] = apiKey;
  }

  // Determine if this is a mutation (requires POST) or query (can use GET)
  const isMutation = endpoint.includes('addItem') || endpoint.includes('updateItem') || endpoint.includes('removeItem') || endpoint.includes('moveMapItem');

  // Honor method override if provided, otherwise use mutation detection
  const usePost = options.method === "POST" || (options.method !== "GET" && isMutation);

  let response: Response;

  if (usePost) {
    // POST for mutations - use batch format in body with batch query parameter
    const batchData = { "0": { json: input } };
    const requestBody = JSON.stringify(batchData);
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] POST batch body size: ${requestBody.length} chars`);
    response = await fetch(`${baseUrl}/services/api/trpc/${endpoint}?batch=1`, {
      method: "POST",
      headers,
      body: requestBody,
    });
  } else {
    // GET for queries
    response = await fetch(url, {
      method: "GET",
      headers,
    });
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Response status: ${response.status} ${response.statusText}`);
  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Response headers: content-type=${response.headers.get('content-type')}, content-length=${response.headers.get('content-length')}`);

  const rawResponseText = await response.text();
  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Raw response body size: ${rawResponseText.length} chars`);

  if (!response.ok) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Request failed with status ${response.status}`);
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(rawResponseText);
  } catch (parseError) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Failed to parse JSON: ${parseError instanceof Error ? parseError.message : 'parse error'}`);
    throw new Error(`Invalid JSON response from server`);
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Parsed response data shape: ${Array.isArray(data) ? `array[${data.length}]` : typeof data}`);

  // Both mutations and queries return batch format
  const batchData = Array.isArray(data) ? data : [data];
  const item = batchData[0] as { error?: { message?: string }; result?: { data: { json: T } } };

  if (!item) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Empty batch response array`);
    throw new Error("Empty API response");
  }

  if (item.error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] tRPC error in response: ${item.error?.message ?? 'unknown error'}`);
    throw new Error(item.error.message ?? "API error");
  }

  if (!item.result) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] No result in response item`);
    throw new Error("Invalid API response");
  }

  if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Success! Returning data type: ${typeof item.result?.data.json}`);
  return item.result.data.json;

  } catch (error) {
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] Exception in callTrpcEndpoint: ${error instanceof Error ? error.message : 'unknown error'}`);
    throw error;
  }
}

// Helper to get a map item by coordinates
async function getItemByCoords(coords: {
  userId: number;
  groupId: number;
  path: number[];
}): Promise<MapItem | null> {
  try {
    // This is a public endpoint, so no authentication required
    return await callTrpcEndpoint<MapItem>("map.getItemByCoords", {
      coords,
    }, { requireAuth: false });
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
  if (process.env.DEBUG_MCP === "true") console.error("[MCP DEBUG] addItemHandler called! Title:", title);
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
      const parentItem = await getItemByCoords(parentCoords);
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

    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] About to call map.addItem with parentId: ${parentId}, title length: ${title.length}`);
    const newItem = await callTrpcEndpoint<MapItem>("map.addItem", {
      coords,
      parentId,
      title,
      descr,
      url,
    }, { requireAuth: true });
    if (process.env.DEBUG_MCP === "true") console.error(`[MCP DEBUG] map.addItem returned item with id: ${newItem?.id}`);

    return newItem;
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

// Handler for updateItem tool
export async function updateItemHandler(
  coords: { userId: number; groupId: number; path: number[] },
  updates: { title?: string; descr?: string; url?: string },
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
