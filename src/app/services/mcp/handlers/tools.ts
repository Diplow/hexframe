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

This tool returns nested structure with children[] arrays showing the knowledge hierarchy.`,
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
      },
      required: ["userId"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const userId = argsObj?.userId as number;
      const groupId = (argsObj?.groupId as number) ?? 0;
      const depth = (argsObj?.depth as number) ?? 3;
      return await getUserMapItemsHandler(userId, groupId, depth);
    },
  },

  {
    name: "getItemByCoords",
    description: "Get a single Hexframe tile by its coordinates. Use this to read specific tiles when you know their exact location in the hexagonal hierarchy.",
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
        }
      },
      required: ["coords"],
    },
    handler: async (args: unknown) => {
      const argsObj = args as Record<string, unknown>;
      const coords = argsObj?.coords as { userId: number; groupId: number; path: number[] };
      if (!coords) throw new Error("coords parameter is required");
      return await getItemByCoordsHandler(coords);
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
        url: {
          type: "string",
          description: "Optional URL for the tile"
        }
      },
      required: ["coords", "title"],
    },
    handler: async (args: unknown) => {
      interface AddItemArgs {
        coords: { userId: number; groupId: number; path: number[] };
        title: string;
        descr?: string;
        url?: string;
      }

      const argsObj = args as AddItemArgs;
      const { coords, title, descr, url } = argsObj;

      if (!coords || !title) {
        throw new Error("coords and title parameters are required");
      }

      return await addItemHandler(coords, title, descr, url);
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
            url: { type: "string" }
          }
        }
      },
      required: ["coords", "updates"],
    },
    handler: async (args: unknown) => {
      interface UpdateItemArgs {
        coords: { userId: number; groupId: number; path: number[] };
        updates: { title?: string; descr?: string; url?: string };
      }

      const argsObj = args as UpdateItemArgs;
      const { coords, updates } = argsObj;

      if (!coords || !updates) {
        throw new Error("coords and updates parameters are required");
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
      interface DeleteItemArgs {
        coords: { userId: number; groupId: number; path: number[] };
      }

      const argsObj = args as DeleteItemArgs;
      const { coords } = argsObj;

      if (!coords) {
        throw new Error("coords parameter is required");
      }

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
      interface MoveItemArgs {
        oldCoords: { userId: number; groupId: number; path: number[] };
        newCoords: { userId: number; groupId: number; path: number[] };
      }

      const argsObj = args as MoveItemArgs;
      const { oldCoords, newCoords } = argsObj;

      if (!oldCoords || !newCoords) {
        throw new Error("oldCoords and newCoords parameters are required");
      }

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