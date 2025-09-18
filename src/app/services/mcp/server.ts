#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  mapItemsListHandler,
  mapItemHandler,
  getUserMapItemsHandler,
  getItemByCoordsHandler,
  addItemHandler,
  updateItemHandler,
  deleteItemHandler,
  moveItemHandler,
  getCurrentUserHandler,
} from "~/app/services/mcp/services/map-items";
// Context wrapper no longer needed - context is in tool descriptions

// Create MCP server instance
const server = new Server(
  {
    name: "hexframe-mcp-server",
    version: "1.0.0",
    description: "Hexframe MCP Server - Access hierarchical knowledge maps",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  },
);

// List resources handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "map://items/{rootId}",
        name: "Map Items Hierarchy",
        description: "Get hierarchical structure of map items from a root. Replace {rootId} with a coordinate ID like '1,0' or '1,0:1,2,3'",
        mimeType: "application/json",
      },
      {
        uri: "map://item/{itemId}",
        name: "Single Map Item",
        description: "Get a single map item with context. Replace {itemId} with a coordinate ID",
        mimeType: "application/json",
      },
    ],
  };
});

// Read resource handler
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uriString = request.params.uri;
  const uri = new URL(uriString);

  if (uri.protocol === "map:") {
    // For map://items/1,0 - hostname is "items", pathname is "/1,0"
    if (uri.hostname === "items") {
      const rootId = uri.pathname.slice(1); // Remove leading "/"
      return mapItemsListHandler(uri, rootId);
    } else if (uri.hostname === "item") {
      const itemId = uri.pathname.slice(1); // Remove leading "/"
      return mapItemHandler(uri, itemId);
    }
  }

  throw new Error(`Unknown resource: ${uriString}`);
});

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
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
      },
    ],
  };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "getItemsForRootItem": {
        const userId = args?.userId as number;
        const groupId = (args?.groupId as number) ?? 0;
        const depth = (args?.depth as number) ?? 3;

        const result = await getUserMapItemsHandler(userId, groupId, depth);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "getItemByCoords": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        if (!coords) throw new Error("coords parameter is required");

        const result = await getItemByCoordsHandler(coords);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "addItem": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        const title = args?.title as string;
        const descr = args?.descr as string | undefined;
        const url = args?.url as string | undefined;

        if (!coords || !title) {
          throw new Error("coords and title parameters are required");
        }

        const result = await addItemHandler(coords, title, descr, url);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "updateItem": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };
        const updates = args?.updates as { title?: string; descr?: string; url?: string };

        if (!coords || !updates) {
          throw new Error("coords and updates parameters are required");
        }

        const result = await updateItemHandler(coords, updates);
        
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "getCurrentUser": {
        const result = await getCurrentUserHandler();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "deleteItem": {
        const coords = args?.coords as { userId: number; groupId: number; path: number[] };

        if (!coords) {
          throw new Error("coords parameter is required");
        }

        const result = await deleteItemHandler(coords);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case "moveItem": {
        const oldCoords = args?.oldCoords as { userId: number; groupId: number; path: number[] };
        const newCoords = args?.newCoords as { userId: number; groupId: number; path: number[] };

        if (!oldCoords || !newCoords) {
          throw new Error("oldCoords and newCoords parameters are required");
        }

        const result = await moveItemHandler(oldCoords, newCoords);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
});

// Start the server with stdio transport
async function main() {
  console.error("=== MCP SERVER STARTING ===");
  console.error("Environment check:", {
    API_KEY: process.env.HEXFRAME_API_KEY ? "SET" : "NOT SET",
    NODE_ENV: process.env.NODE_ENV,
    PWD: process.cwd()
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so it doesn't interfere with protocol messages
  console.error("Hexframe MCP Server running on stdio transport");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});