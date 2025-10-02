// Remove unused import
import {
  getUserMapItemsHandler,
  getItemByCoordsHandler,
  addItemHandler,
  updateItemHandler,
  deleteItemHandler,
  moveItemHandler,
  getCurrentUserHandler,
} from "~/app/services/mcp/services/map-items";

/**
 * Shared MCP tool definitions that can be used by both stdio and HTTP transports
 */

/**
 * Helper function to convert coordinates with string values to numbers
 * MCP clients often send coords as JSON strings or with numbers as strings
 */
function normalizeCoordinates(coords: unknown): { userId: number; groupId: number; path: number[] } {
  if (!coords) {
    throw new Error('Coordinates are required');
  }

  // If coords is a string, parse it as JSON first
  let coordsObj: unknown = coords;
  if (typeof coords === 'string') {
    try {
      coordsObj = JSON.parse(coords);
    } catch {
      throw new Error('Invalid coordinates JSON string');
    }
  }

  // Type guard to ensure coordsObj has the expected structure
  if (!coordsObj || typeof coordsObj !== 'object') {
    throw new Error('Coordinates must be an object');
  }

  const coordsInput = coordsObj as Record<string, unknown>;

  return {
    userId: typeof coordsInput.userId === 'string' ? parseInt(coordsInput.userId, 10) : Number(coordsInput.userId),
    groupId: typeof coordsInput.groupId === 'string' ? parseInt(coordsInput.groupId, 10) : Number(coordsInput.groupId),
    path: Array.isArray(coordsInput.path) ? coordsInput.path.map((p: unknown) =>
      typeof p === 'string' ? parseInt(p, 10) : Number(p)
    ) : []
  };
}

/**
 * Helper function to parse JSON string parameters if needed
 */
function parseJsonParam(param: unknown): unknown {
  if (typeof param === 'string') {
    try {
      return JSON.parse(param);
    } catch {
      throw new Error('Invalid JSON string parameter');
    }
  }
  return param;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<unknown>;
}

export const mcpTools: McpTool[] = [
  {
    name: "getItemsForRootItem",
    description: `Get hierarchical tile structure for a user's Hexframe map.

WORKFLOW: First use getCurrentUser to get the user's mappingId, then use that as the userId parameter here.

HEXFRAME CONTEXT: You're working with a hexagonal knowledge mapping system where:
- Tiles are hexagonal units organized hierarchically around a center
- Coordinates: {userId: 1, groupId: 0, path: [0,1]} where path=directions from root
- Directions: 0=Center, 1=NorthWest, 2=NorthEast, 3=East, 4=SouthEast, 5=SouthWest, 6=West
- Empty path=[] means root/center tile
- Each tile can have up to 6 children in different directions

This tool returns nested structure with children[] arrays showing the knowledge hierarchy.
Use 'fields' parameter for progressive disclosure: ["name", "preview"] for overview, ["name", "descr"] for full content.`,
    inputSchema: {
      type: "object",
      properties: {
        userId: {
          type: "number",
          description: "The user ID to fetch map items for (get this from getCurrentUser.mappingId)",
        },
        groupId: {
          type: "number",
          description: "The group ID (default: 0)",
          default: 0,
        },
        depth: {
          type: "number",
          description: "How many levels deep to fetch (default: 3, max: 10)",
          default: 3,
          minimum: 1,
          maximum: 10,
        },
        fields: {
          type: "array",
          items: {
            type: "string",
            enum: ["title", "descr", "preview", "link", "id", "coordinates", "depth", "parentId", "itemType", "ownerId"]
          },
          description: "Fields to include in response. For overview use ['title', 'preview'], for full content use ['title', 'descr']. Default: all fields",
          default: ["title", "descr", "preview", "link", "id", "coordinates", "depth", "parentId", "itemType", "ownerId"]
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;

      // Convert string parameters to numbers (Claude Code sends strings)
      let userId: number | undefined;
      if (argsObj?.userId) {
        userId = typeof argsObj.userId === 'string' ? parseInt(argsObj.userId, 10) : argsObj.userId as number;
      }

      // If no userId provided, use the authenticated user's ID
      if (!userId && argsObj?.authInfo) {
        const authInfo = argsObj.authInfo as { clientId?: string };
        const parsedUserId = authInfo.clientId ? parseInt(authInfo.clientId, 10) : undefined;
        if (parsedUserId) {
          userId = parsedUserId;
        }
      }

      const groupId = argsObj?.groupId ?
        (typeof argsObj.groupId === 'string' ? parseInt(argsObj.groupId, 10) : argsObj.groupId as number) : 0;
      const depth = argsObj?.depth ?
        (typeof argsObj.depth === 'string' ? parseInt(argsObj.depth, 10) : argsObj.depth as number) : 3;

      // Parse fields parameter for field selection
      const fields = argsObj?.fields as string[] | undefined;

      if (!userId) {
        throw new Error('userId is required');
      }

      return await getUserMapItemsHandler(userId, groupId, depth, fields);
    },
  },

  {
    name: "getItemByCoords",
    description: "Get a single Hexframe tile by its coordinates. Use this to read specific tiles when you know their exact location in the hexagonal hierarchy. Use 'fields' parameter for progressive disclosure.",
    inputSchema: {
      type: "object",
      properties: {
        coords: {
          type: "object",
          description: "The coordinates of the tile to fetch",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root (empty for root tile)"
            }
          },
          required: ["userId", "groupId", "path"]
        },
        fields: {
          type: "array",
          items: {
            type: "string",
            enum: ["title", "descr", "preview", "link", "id", "coordinates", "depth", "parentId", "itemType", "ownerId"]
          },
          description: "Fields to include in response. For overview use ['title', 'preview'], for full content use ['title', 'descr']. Default: all fields",
          default: ["title", "descr", "preview", "link", "id", "coordinates", "depth", "parentId", "itemType", "ownerId"]
        }
      },
      required: ["coords"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const coords = normalizeCoordinates(argsObj?.coords);
      const fields = argsObj?.fields as string[] | undefined;
      return await getItemByCoordsHandler(coords, fields);
    },
  },

  {
    name: "addItem",
    description: "Create a new Hexframe tile at specified coordinates. The tile will be created as a child of the parent at the given direction. For root tiles, use empty path=[].",
    inputSchema: {
      type: "object",
      properties: {
        coords: {
          type: "object",
          description: "The coordinates where to create the new tile",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root"
            }
          },
          required: ["userId", "groupId", "path"]
        },
        title: {
          type: "string",
          description: "The title of the new tile"
        },
        descr: {
          type: "string",
          description: "The content/description of the new tile (optional)"
        },
        preview: {
          type: "string",
          description: "Short preview text for quick scanning (optional)"
        },
        url: {
          type: "string",
          description: "Optional URL for the tile"
        }
      },
      required: ["coords", "title"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const coords = normalizeCoordinates(argsObj?.coords);
      const title = argsObj?.title as string;
      const descr = argsObj?.descr as string | undefined;
      const preview = argsObj?.preview as string | undefined;
      const url = argsObj?.url as string | undefined;

      if (!title) {
        throw new Error("title parameter is required");
      }

      return await addItemHandler(coords, title, descr, preview, url);
    },
  },

  {
    name: "updateItem",
    description: "Update an existing Hexframe tile's content (title, description, or URL). Use coordinates to specify which tile to modify.",
    inputSchema: {
      type: "object",
      properties: {
        coords: {
          type: "object",
          description: "The coordinates of the tile to update",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root"
            }
          },
          required: ["userId", "groupId", "path"]
        },
        updates: {
          type: "object",
          description: "The fields to update",
          properties: {
            title: { type: "string" },
            descr: { type: "string" },
            preview: { type: "string" },
            url: { type: "string" }
          }
        }
      },
      required: ["coords", "updates"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const coords = normalizeCoordinates(argsObj?.coords);
      const updates = parseJsonParam(argsObj?.updates) as { title?: string; descr?: string; url?: string };

      if (!updates) {
        throw new Error("updates parameter is required");
      }

      return await updateItemHandler(coords, updates);
    },
  },

  {
    name: "getCurrentUser",
    description: `Get information about the currently authenticated user.

WORKFLOW: Use this tool first to get the user's mappingId (which is their userId), then use that userId with getItemsForRootItem to access their hexagonal knowledge map.

Returns user info including:
- id: Authentication ID
- mappingId: User ID for map operations (use this with other tools)
- email, name, emailVerified status
- createdAt, updatedAt timestamps`,
    inputSchema: {
      type: "object",
      properties: {},
    },
    handler: async () => {
      return await getCurrentUserHandler();
    },
  },

  {
    name: "deleteItem",
    description: `🚨 DANGEROUS: Delete a Hexframe tile and ALL its descendants permanently.

⚠️ WARNING: This operation is irreversible and will cause data loss:
- Deletes the specified tile
- Deletes ALL child tiles recursively (entire subtree)
- Cannot be undone

Use with extreme caution. Always verify coordinates before deletion. Consider moving tiles instead of deleting if you need to reorganize.`,
    inputSchema: {
      type: "object",
      properties: {
        coords: {
          type: "object",
          description: "The coordinates of the tile to delete",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root"
            }
          },
          required: ["userId", "groupId", "path"]
        }
      },
      required: ["coords"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const coords = normalizeCoordinates(argsObj?.coords);
      return await deleteItemHandler(coords);
    },
  },

  {
    name: "moveItem",
    description: `🔄 SENSITIVE: Move a Hexframe tile and its entire subtree to a new location.

⚠️ CAUTION: This operation affects multiple tiles:
- Moves the specified tile to new coordinates
- Moves ALL child tiles with it (entire subtree)
- Updates all coordinate references
- Wrong usage might lead to data inconsistency

Ensure both old and new coordinates are correct. The user must own both the item being moved and the destination parent.`,
    inputSchema: {
      type: "object",
      properties: {
        oldCoords: {
          type: "object",
          description: "Current coordinates of the tile to move",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root"
            }
          },
          required: ["userId", "groupId", "path"]
        },
        newCoords: {
          type: "object",
          description: "New coordinates where to move the tile",
          properties: {
            userId: { type: "number" },
            groupId: { type: "number" },
            path: {
              type: "array",
              items: { type: "number" },
              description: "Array of directions from root"
            }
          },
          required: ["userId", "groupId", "path"]
        }
      },
      required: ["oldCoords", "newCoords"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const oldCoords = normalizeCoordinates(argsObj?.oldCoords);
      const newCoords = normalizeCoordinates(argsObj?.newCoords);
      return await moveItemHandler(oldCoords, newCoords);
    },
  },
];

/**
 * Helper function to format tool response for MCP protocol
 */
export function formatToolResponse(result: unknown): { content: Array<{ type: "text"; text: string }> } {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

/**
 * Helper function to handle tool execution with error handling
 */
export async function executeTool(toolName: string, args: unknown): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    const tool = mcpTools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const result = await tool.handler(args);
    return formatToolResponse(result);
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}